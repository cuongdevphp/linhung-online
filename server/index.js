import express from 'express';
import compression from 'compression';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as L from '../shared/layout.js';
import { startNpcs } from './npc.js';
import { CABLE } from '../shared/summit.js';
import { fortuneFor, validBirthYear, stickFor, STICK_COUNT, castYi, YI_TOPICS, compatibility } from '../shared/oracle.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 5000;
const MAX_PLAYERS = Number(process.env.MAX_PLAYERS) || 120;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

const MAX_SPEED = 12;                 // m/s, lớn hơn tốc độ chạy 9 m/s để chịu được trễ mạng
const WEATHER_MIN_MS = 15000;         // giãn cách tối thiểu giữa hai lần đổi thời tiết
const MAX_INCENSE = 80;
const MAX_LANTERNS = 80;
const RIDE_GAP_MS = 9000;             // hai chuyến cáp treo xuất phát cách nhau ít nhất bấy lâu để cabin không chồng lên nhau
const CABIN_SEATS = 2;                // cabin chở tối đa 2 người
const CABIN_WAIT_MS = 30000;          // người đầu tiên lên cabin chờ tối đa bấy lâu rồi cabin tự trượt
let lastRideAt = 0;

/* ====================== HTTP ====================== */
const app = express();
app.disable('x-powered-by');
app.use(compression());
app.use((_req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); next(); });
app.get('/healthz', (_req, res) => res.type('text').send('ok'));

const vendor = { maxAge: '7d' };
app.use('/vendor/three/build', express.static(path.join(ROOT, 'node_modules/three/build'), vendor));
app.use('/vendor/three/examples/jsm', express.static(path.join(ROOT, 'node_modules/three/examples/jsm'), vendor));
app.use('/shared', express.static(path.join(ROOT, 'shared'), { etag: true, maxAge: 0 }));
app.use(express.static(path.join(ROOT, 'public'), { etag: true, maxAge: 0 }));

const httpServer = createServer(app);
const io = new Server(httpServer, { maxHttpBufferSize: 1e4, pingInterval: 20000, pingTimeout: 25000 });

/* ====================== TRẠNG THÁI ====================== */
const players = new Map();
const incense = [];     // { id, x, z, t }
const lanterns = [];    // { id, t, seed }
let merit = 0;
let weather = { key: 'nang', at: Date.now() };
let seq = 1;

try {
  const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  if (Number.isFinite(saved.merit) && saved.merit >= 0) merit = Math.floor(saved.merit);
  if (L.WEATHER_KEYS.includes(saved.weather)) weather.key = saved.weather;
} catch { /* chưa có file trạng thái */ }

const NPC_COUNT = startNpcs(players, io, () => merit);   // Phật tử ảo: thiền, lễ Phật, đi dạo

let dirty = false;
function saveState() {
  if (!dirty) return;
  dirty = false;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = STATE_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify({ merit, weather: weather.key }));
    fs.renameSync(tmp, STATE_FILE);
  } catch (e) { console.error('Không lưu được trạng thái:', e.message); }
}
setInterval(saveState, 10000).unref();

/* ====================== TIỆN ÍCH ====================== */
const BAD_CHARS = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF<>]/g;
function clean(v, max) {
  if (typeof v !== 'string') return '';
  const s = v.normalize('NFC').replace(BAD_CHARS, '').replace(/\s+/g, ' ').trim();
  return Array.from(s).slice(0, max).join('');
}

/* Token bucket: cho phép `burst` sự kiện liền nhau, nạp lại `rate` sự kiện mỗi giây. */
function bucket(rate, burst) {
  let tokens = burst, last = Date.now();
  return () => {
    const n = Date.now();
    tokens = Math.min(burst, tokens + (n - last) / 1000 * rate);
    last = n;
    if (tokens < 1) return false;
    tokens -= 1;
    return true;
  };
}

const pub = p => ({ id: p.id, name: p.name, color: p.color, x: p.x, z: p.z, ry: p.ry, moving: p.moving, sitting: p.sitting, act: p.act, monk: p.monk, ride: p.ride && !p.ride.waiting ? p.ride : undefined });

/* Ngày hiện tại theo giờ Việt Nam (UTC+7), dạng YYYY-MM-DD, làm hạt giống cho kết quả tử vi trong ngày. */
const vnDay = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

/* Cabin đang chờ ở ga đỉnh (tối đa CABIN_SEATS người). */
const cabin = { riders: [], since: 0, timer: null };
let rideSeq = 0;
const cabinPublic = () => ({ riders: cabin.riders.slice(), leaveAt: cabin.riders.length ? cabin.since + CABIN_WAIT_MS : 0 });
const broadcastCabin = () => io.emit('cabin', cabinPublic());

/* Bỏ người chơi khỏi cabin đang chờ. Trả về false nếu họ không ở trong cabin. */
function leaveCabin(p) {
  const i = cabin.riders.indexOf(p.id);
  if (i < 0) return false;
  cabin.riders.splice(i, 1);
  if (p.ride && p.ride.waiting) p.ride = null;
  if (!cabin.riders.length) { clearTimeout(cabin.timer); cabin.timer = null; }
  return true;
}

/* Cabin rời ga: mọi người trong cabin cùng đi một chuyến. */
function departCabin() {
  if (!cabin.riders.length) return;
  clearTimeout(cabin.timer); cabin.timer = null;
  const now = Date.now(), riders = cabin.riders.splice(0), rid = ++rideSeq;
  lastRideAt = now;
  for (const id of riders) {
    const p = players.get(id);
    if (!p) continue;
    p.ride = { rid, riders, t0: now, dur: CABLE.rideMs };
    setTimeout(() => endRide(id), CABLE.rideMs + 400).unref();
  }
  io.emit('ride', { rid, riders, t0: now, dur: CABLE.rideMs });
  broadcastCabin();
}

/* Kết thúc chuyến cáp treo: đặt người chơi ở ga chân núi và báo cho mọi người. */
function endRide(id) {
  const p = players.get(id);
  if (!p || !p.ride) return;
  p.ride = null;
  p.x = CABLE.exit.x; p.z = CABLE.exit.z; p.ry = CABLE.exit.ry; p.moving = false; p.lastMove = Date.now();
  io.emit('rideEnd', { id, x: p.x, z: p.z, ry: p.ry });
}

function prune() {
  const now = Date.now();
  while (lanterns.length && now - lanterns[0].t > L.LANTERN_LIFE_MS) lanterns.shift();
  while (incense.length && now - incense[0].t > L.INCENSE_LIFE_MS) incense.shift();
}
setInterval(prune, 20000).unref();

function setWeather(key, by) {
  weather = { key, at: Date.now() };
  dirty = true;
  io.emit('weather', { key, by: by || null });
}

/* Thời tiết tự đổi sau mỗi 5-10 phút, ưu tiên trời đẹp. */
const WEIGHTS = { nang: 5, binhminh: 1.5, hoanghon: 1.5, may: 2, mua: 2, giong: 1, suong: 2, dem: 2, tuyet: 1.5 };
function pickWeather() {
  const keys = L.WEATHER_KEYS.filter(k => k !== weather.key);
  const total = keys.reduce((s, k) => s + WEIGHTS[k], 0);
  let r = Math.random() * total;
  for (const k of keys) { r -= WEIGHTS[k]; if (r <= 0) return k; }
  return keys[0];
}
function scheduleWeather() {
  const wait = (5 + Math.random() * 5) * 60 * 1000;
  setTimeout(() => {
    if (Date.now() - weather.at > WEATHER_MIN_MS) setWeather(pickWeather(), null);
    scheduleWeather();
  }, wait).unref();
}
scheduleWeather();

/* ====================== SOCKET ====================== */
io.on('connection', socket => {
  prune();
  socket.emit('hello', { now: Date.now(), weather: weather.key, lanterns, merit, count: players.size });

  const allowMove = bucket(40, 40);
  const allowChat = bucket(0.8, 3);
  const allowAction = bucket(6, 8);
  const allowWeather = bucket(0.2, 2);
  const allowSit = bucket(1, 4);
  const allowFortune = bucket(0.4, 3);
  const allowCable = bucket(1, 5);
  const cool = {};

  socket.on('join', d => {
    if (players.has(socket.id)) return;
    if (players.size - NPC_COUNT >= MAX_PLAYERS) return socket.emit('full');
    const name = clean(d && d.name, 20);
    if (!name) return socket.emit('notice', 'Hãy nhập pháp danh của bạn');
    const color = L.ROBES.some(r => r[0] === (d && d.color)) ? d.color : L.ROBES[0][0];
    let sp = L.spawnPoint();
    if (d && Number.isFinite(d.x) && Number.isFinite(d.z)) {          // nối lại sau khi mất mạng: giữ chỗ đang đứng
      const [cx, cz] = L.clampToBounds(d.x, d.z);
      sp = { x: cx, z: cz, ry: Number.isFinite(d.ry) ? d.ry : sp.ry };
    }
    const p = { id: socket.id, name, color, x: sp.x, z: sp.z, ry: sp.ry, moving: false, sitting: false, lastMove: Date.now() };
    players.set(socket.id, p);
    prune();
    socket.emit('init', { selfId: socket.id, now: Date.now(), players: [...players.values()].map(pub), incense, cabin: cabinPublic() });
    socket.broadcast.emit('joined', pub(p));
    socket.broadcast.emit('system', `🙏 ${name} vừa bước vào cổng chùa`);
    io.emit('count', players.size);
  });

  socket.on('move', d => {
    const p = players.get(socket.id);
    if (!p || !d || p.ride || !allowMove()) return;                  // đang ngồi cáp treo thì vị trí do server điều khiển
    const x = Number(d.x), z = Number(d.z), ry = Number(d.ry);
    if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(ry)) return;
    const now = Date.now();
    const dt = Math.max(0.016, (now - p.lastMove) / 1000);
    p.lastMove = now;
    let nx = x, nz = z;
    const dx = nx - p.x, dz = nz - p.z, dist = Math.hypot(dx, dz), maxStep = MAX_SPEED * dt + 2;
    if (dist > maxStep) { nx = p.x + dx / dist * maxStep; nz = p.z + dz / dist * maxStep; }
    [nx, nz] = L.clampToBounds(nx, nz);
    p.x = nx; p.z = nz; p.ry = ((ry % 6.2832) + 6.2832) % 6.2832; p.moving = !!d.moving;
    if (p.sitting && p.moving) {                       // đã bước đi thì không còn ngồi thiền
      p.sitting = false;
      socket.broadcast.emit('sit', { id: p.id, on: false });
    }
    socket.volatile.broadcast.emit('moved', { id: p.id, x: p.x, z: p.z, ry: p.ry, moving: p.moving });
  });

  /* Ngồi thiền / đứng dậy. Mỗi lần ngồi được +1 công đức, cách nhau tối thiểu 30 giây. */
  socket.on('sit', on => {
    const p = players.get(socket.id);
    if (!p || p.ride || !allowSit()) return;
    on = on === true;
    if (p.sitting === on) return;
    p.sitting = on;
    if (on) p.moving = false;
    socket.broadcast.emit('sit', { id: p.id, on });
    if (!on) return;
    const now = Date.now();
    if (now - (cool.meditate || 0) < L.ACTION_COOLDOWN_MS.meditate) return;
    cool.meditate = now;
    merit++; dirty = true;
    io.emit('action', { id: p.id, type: 'meditate', merit });
  });

  socket.on('chat', text => {
    const p = players.get(socket.id);
    const t = clean(text, 140);
    if (!p || !t || !allowChat()) return;
    io.emit('chat', { id: p.id, name: p.name, color: p.color, text: t });
  });

  socket.on('action', d => {
    const p = players.get(socket.id);
    const type = d && d.type;
    if (!p || !L.ACTIONS.includes(type) || !allowAction()) return;
    const now = Date.now();
    if (now - (cool[type] || 0) < L.ACTION_COOLDOWN_MS[type]) return;
    if (type !== 'bow') {
      const s = L.SPOTS.find(s => s.type === type);
      if (Math.hypot(p.x - s.x, p.z - s.z) > s.r + 3.5) return socket.emit('notice', 'Hãy lại gần hơn một chút');
    }
    cool[type] = now;
    merit++; dirty = true;
    io.emit('action', { id: p.id, type, merit });
    if (type === 'incense') {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 1.35;
      const stick = { id: seq++, x: Math.cos(a) * r, z: Math.sin(a) * r, t: now };
      incense.push(stick);
      while (incense.length > MAX_INCENSE) incense.shift();
      io.emit('incense', stick);
    } else if (type === 'lantern') {
      const l = { id: seq++, t: now, seed: Math.random() };
      lanterns.push(l);
      while (lanterns.length > MAX_LANTERNS) lanterns.shift();
      io.emit('lantern', l);
    }
  });

  /* Xem tử vi ở Tử Vi Đường: chỉ trả kết quả cho người hỏi. Cùng năm sinh, cùng ngày thì ra cùng kết quả. Chỉ để giải trí. */
  /* Điều kiện chung cho các dịch vụ ở Tử Vi Đường: đang ở đủ gần, không đang ngồi cáp treo, không bấm quá nhanh. */
  const oracleReady = () => {
    const p = players.get(socket.id);
    if (!p || p.ride || !allowFortune()) return null;
    const s = L.SPOTS.find(s => s.type === 'fortune');
    if (Math.hypot(p.x - s.x, p.z - s.z) > s.r + 3.5) { socket.emit('notice', 'Hãy lại gần Tử Vi Đường'); return null; }
    return p;
  };
  /* Báo cho mọi người ở sân đỉnh: ống xăm lắc, đồng xu tung… và một dòng trong khung trò chuyện. */
  const oracleShow = (p, kind, text) => { io.emit('oracle', { id: p.id, kind }); if (text) io.emit('system', text); };

  socket.on('fortune', d => {
    const p = oracleReady();
    if (!p) return;
    const year = Number(d && d.year);
    if (!validBirthYear(year)) return socket.emit('notice', 'Năm sinh chưa hợp lệ');
    const gender = d && (d.gender === 'nam' || d.gender === 'nu') ? d.gender : undefined;
    socket.emit('fortune', fortuneFor(year, vnDay(), gender, new Date().getFullYear()));
    oracleShow(p, 'star');
  });

  /* Xin xăm: server rút ngẫu nhiên một trong 100 số xăm; cùng số xăm thì luôn cùng bài thơ. */
  socket.on('stick', () => {
    const p = oracleReady();
    if (!p) return;
    const stick = stickFor(1 + Math.floor(Math.random() * STICK_COUNT));
    socket.emit('stick', stick);
    oracleShow(p, 'stick', `🎋 ${p.name} vừa xin được quẻ xăm số ${stick.n} · ${stick.levelName}`);
  });

  /* Gieo quẻ Kinh Dịch bằng ba đồng xu, sáu lần. */
  socket.on('yi', d => {
    const p = oracleReady();
    if (!p) return;
    const topic = d && YI_TOPICS.includes(d.topic) ? d.topic : 'suNghiep';
    const res = castYi(Math.random, topic);
    socket.emit('yi', res);
    oracleShow(p, 'yi', `☯ ${p.name} vừa gieo được quẻ ${res.primary.name}${res.changed ? ' biến ' + res.changed.name : ''}`);
  });

  /* Xem tuổi hợp giữa hai năm sinh. */
  socket.on('compat', d => {
    const p = oracleReady();
    if (!p) return;
    const a = Number(d && d.a), b = Number(d && d.b);
    if (!validBirthYear(a) || !validBirthYear(b)) return socket.emit('notice', 'Năm sinh chưa hợp lệ');
    socket.emit('compat', compatibility(a, b));
    oracleShow(p, 'match');
  });

  /* Cáp treo một chiều từ ga Đỉnh Mây xuống ga chân núi. Cabin chở tối đa 2 người: người lên trước chờ ở ga,
   * người thứ hai có thể lên cùng, ai trong cabin bấm "Trượt" thì cabin đi (hoặc tự đi sau CABIN_WAIT_MS). Chuyến chạy theo giờ server. */
  socket.on('cable', () => {
    const p = players.get(socket.id);
    if (!p || p.ride || !allowCable()) return;
    const s = L.SPOTS.find(s => s.type === 'cable');
    if (Math.hypot(p.x - s.x, p.z - s.z) > s.r + 3.5) return socket.emit('notice', 'Hãy lại gần ga cáp treo');
    if (cabin.riders.length >= CABIN_SEATS) return socket.emit('notice', 'Cabin đã đủ 2 người, mời bạn đi cabin sau');
    const now = Date.now();
    if (!cabin.riders.length && now - lastRideAt < RIDE_GAP_MS) return socket.emit('notice', 'Cabin vừa rời ga, xin chờ vài giây…');
    cabin.riders.push(p.id);
    p.ride = { waiting: true };
    p.moving = false;
    if (p.sitting) { p.sitting = false; socket.broadcast.emit('sit', { id: p.id, on: false }); }
    if (cabin.riders.length === 1) { cabin.since = now; cabin.timer = setTimeout(departCabin, CABIN_WAIT_MS); cabin.timer.unref(); }
    broadcastCabin();
  });

  socket.on('slide', () => {
    const p = players.get(socket.id);
    if (!p || !allowCable() || !cabin.riders.includes(p.id)) return;
    departCabin();
  });

  /* Xuống khỏi cabin khi chưa trượt: về lại chỗ lên cabin. */
  socket.on('cableLeave', () => {
    const p = players.get(socket.id);
    if (!p || !allowCable() || !leaveCabin(p)) return;
    const s = L.SPOTS.find(s => s.type === 'cable');
    p.x = s.x; p.z = s.z; p.lastMove = Date.now();
    io.emit('rideEnd', { id: p.id, x: p.x, z: p.z, ry: p.ry });
    broadcastCabin();
  });

  socket.on('weather:set', key => {
    const p = players.get(socket.id);
    if (!p || !L.WEATHER_KEYS.includes(key) || !allowWeather() || key === weather.key) return;
    if (Date.now() - weather.at < WEATHER_MIN_MS) return socket.emit('notice', 'Trời vừa chuyển, xin chờ giây lát…');
    setWeather(key, p.name);
  });

  socket.on('disconnect', () => {
    const p = players.get(socket.id);
    if (!p) return;
    if (leaveCabin(p)) broadcastCabin();                  // đang chờ trong cabin thì nhường chỗ
    players.delete(socket.id);
    io.emit('left', p.id);
    io.emit('count', players.size);
    io.emit('system', `${p.name} đã rời chùa. Nam mô A Di Đà Phật 🙏`);
  });
});

/* ====================== KHỞI ĐỘNG ====================== */
httpServer.listen(PORT, () => console.log(`Chùa Linh Ứng Online chạy tại http://localhost:${PORT}`));

function shutdown() { dirty = true; saveState(); process.exit(0); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
