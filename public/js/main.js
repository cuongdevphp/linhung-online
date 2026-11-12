import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ROBES, BELL, DRUM, STATUE, POND, BODHI, MO_PLAYER, POD } from '/shared/layout.js';
import { buildTerrain, terrainHeight } from './terrain.js';
import { stairQuery, stairProgress, PILGRIM, PLAZA_DISCS, LOWER_PAD } from '/shared/stairs.js';
import { SUMMIT_ZONES } from '/shared/summit.js';
import { buildWorld } from './world.js';
import { heightAt, blocked, cushionNear, seatLiftAt } from './collision.js';
import { createLife } from './life.js';
import { makeHuman } from './human.js';
import { createWeather, PRESETS } from './weather.js';
import { sfx } from './audio.js';
import { templeMusic } from './temple-music.js';
import { attachWork, updateWork } from './work.js';
import { lerpAngle, makeLabel, clamp } from './util.js';
import { M } from './materials.js';
import { STATUE_MATS } from './statues.js';

const $ = s => document.querySelector(s);
const isTouch = matchMedia('(pointer:coarse)').matches;
const params = new URLSearchParams(location.search);
const DEV = params.has('dev');

/* Chờ phông chữ để bảng hiệu vẽ bằng canvas dùng đúng font (tối đa 2,5 giây). */
await Promise.race([
  Promise.all([document.fonts.load('700 40px "Playfair Display"'), document.fonts.load('600 34px "Be Vietnam Pro"')]).catch(() => { }),
  new Promise(r => setTimeout(r, 2500))
]);

/* ====================== RENDERER ====================== */
const canvas = $('#scene');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (err) {
  $('#loading span').textContent = 'Trình duyệt hoặc thiết bị của bạn chưa bật WebGL nên chưa thể vào chùa. Hãy thử Chrome, Edge, Firefox hoặc Safari bản mới.';
  $('#loading .lotus-spin').style.animation = 'none';
  $('#join')?.remove();
  throw err;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.3 : 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
if (DEV) renderer.info.autoReset = false;   // đếm gộp mọi pass trong một khung hình

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcfe0e8, 70, 380);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 1500);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.35, 0.55, 0.86);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const hemi = new THREE.HemisphereLight(0xffffff, 0x3b4a2a, 1.1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -72, right: 72, top: 72, bottom: -72, near: 1, far: 300 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);

/* ====================== THẾ GIỚI ====================== */
const weather = createWeather(scene, renderer, sun, hemi);
weather.onThunder = (delay, vol) => sfx.thunder(delay, vol);
const terrain = buildTerrain(scene);
const W = buildWorld(scene);
const life = createLife(scene, W, sfx);

/* ====================== NGƯỜI CHƠI ====================== */
const players = new Map();
let selfId = null, me = null;

function createPlayer(p) {
  if (players.has(p.id)) return players.get(p.id);
  let hash = 0; for (const ch of p.name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  const h = makeHuman({ robe: p.color, hair: hash & 1 ? 'bun' : 'short', skinTone: Math.abs(hash) % 4, shaved: !!p.monk });
  h.root.position.set(p.x, heightAt(p.x, p.z), p.z); h.root.rotation.y = p.ry;
  const label = makeLabel(p.name); label.position.y = h.height + 0.1; h.root.add(label);
  scene.add(h.root);
  const o = Object.assign(h, { id: p.id, name: p.name, color: p.color, label, target: new THREE.Vector3(p.x, 0, p.z), targetRy: p.ry, moving: !!p.moving, sitting: !!p.sitting, walk: 0, bow: 0, bubble: null, bubbleT: 0 });
  if (p.act) attachWork(o, p.act);                       // Phật tử làm công quả trong nhà bếp
  players.set(p.id, o);
  if (p.ride) startRide(o, p.ride);                      // vào chùa giữa lúc ai đó đang ngồi cáp treo
  return o;
}

/* ---- cáp treo: vị trí cabin tính từ giờ server nên mọi người thấy cùng một chuyến ---- */
function startRide(o, r) {
  if (o.ride) return;
  o.ride = { t0: r.t0 / 1000, dur: r.dur / 1000, cabin: W.cable.makeCabin() };
  o.sitting = true; o.moving = false;
  if (o === me) { meditating = false; updateSitUI(); }
}
function endRide(o, x, z, ry) {
  if (o.ride) { W.cable.remove(o.ride.cabin); o.ride = null; }
  o.sitting = false; o.moving = false;
  o.root.position.set(x, heightAt(x, z), z); o.root.rotation.y = ry; o.target.set(x, 0, z); o.targetRy = ry;
}
function rideStep(o, st, t) {
  const r = o.ride, u = clamp((st - r.t0) / r.dur, 0, 1);
  const y = W.cable.place(r.cabin, u, W.cable.laneDown, t);
  o.root.position.set(r.cabin.position.x, y + 0.3, r.cabin.position.z);
  o.root.rotation.y = W.cable.heading; o.targetRy = W.cable.heading;
  o.target.set(o.root.position.x, 0, o.root.position.z);
  o.sitting = true; o.moving = false;
}
function removePlayer(id) {
  const o = players.get(id); if (!o) return;
  if (o.ride) W.cable.remove(o.ride.cabin);
  scene.remove(o.root); o.label.userData.dispose?.(); o.bubble?.userData.dispose?.();
  players.delete(id);
}
function showBubble(o, text) {
  if (o.bubble) { o.root.remove(o.bubble); o.bubble.userData.dispose?.(); }
  const chars = Array.from(text);
  o.bubble = makeLabel(chars.length > 42 ? chars.slice(0, 40).join('') + '…' : text, { bubble: true });
  o.bubble.position.y = o.height + 0.55; o.root.add(o.bubble); o.bubbleT = 6;
}

/* ====================== GIAO DIỆN ====================== */
let robe = ROBES[0][0];
ROBES.forEach(([c, n], i) => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'robe' + (i ? '' : ' on');
  const dot = document.createElement('i'); dot.style.background = c;
  b.append(dot, n);
  b.addEventListener('click', () => { robe = c; document.querySelectorAll('.robe').forEach(x => x.classList.remove('on')); b.classList.add('on'); });
  $('#robes').appendChild(b);
});
try { $('#name').value = localStorage.getItem('linhung-name') || ''; } catch { /* chế độ riêng tư */ }

function toast(html) {
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = html; $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 3200);
  while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function addMsg(name, text, color) {
  const d = document.createElement('div');
  if (name) {
    d.className = 'msg'; const b = document.createElement('b'); b.textContent = name;
    b.style.color = /^#[0-9a-f]{6}$/i.test(color) ? (color === '#e9e2d0' ? '#f5e9cf' : color) : '#f5e9cf';
    d.append(b, text);
  } else { d.className = 'msg sys'; d.textContent = text; }
  $('#messages').appendChild(d); $('#messages').scrollTop = 1e6;
  while ($('#messages').children.length > 60) $('#messages').firstChild.remove();
}
function setMerit(n, bump = true) {
  $('#merit').textContent = n.toLocaleString('vi-VN');
  if (!bump) return;
  const m = $('.merit'); m.classList.remove('bump'); void m.offsetWidth; m.classList.add('bump');
}
function setWeatherUI() {
  $('#weatherLabel').textContent = weather.label;
  document.querySelectorAll('.wopt').forEach(b => b.classList.toggle('on', b.dataset.k === weather.key));
}

/* ====================== MẠNG ====================== */
const socket = io();
let joined = false, joining = false, timeOffset = 0, myName = '';
const sNow = () => (Date.now() + timeOffset) / 1000;

Object.entries(PRESETS).forEach(([k, p]) => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'wopt'; b.dataset.k = k; b.textContent = p.label;
  b.addEventListener('click', () => { socket.emit('weather:set', k); $('#weatherMenu').hidden = true; });
  $('#weatherMenu').appendChild(b);
});
$('#weatherBtn').addEventListener('click', () => { $('#weatherMenu').hidden = !$('#weatherMenu').hidden; });
$('#soundBtn').addEventListener('click', () => { $('#soundBtn').textContent = sfx.toggle() ? '🔊' : '🔇'; });

socket.on('hello', d => {
  timeOffset = d.now - Date.now();
  weather.set(d.weather, !joined); setWeatherUI();
  d.lanterns.forEach(life.addLantern);
  setMerit(d.merit, false);
});
socket.on('connect', () => {
  if (!joined) return;                                   // nối lại sau khi mất mạng: vào lại đúng chỗ cũ
  const p = me?.root.position;
  socket.emit('join', { name: myName, color: robe, x: p?.x, z: p?.z, ry: me?.root.rotation.y });
});

function showJoinMsg(text) {
  let el = $('#joinMsg');
  if (!el) { el = document.createElement('p'); el.id = 'joinMsg'; el.className = 'credit'; el.style.color = '#ffb4a0'; $('#joinForm').appendChild(el); }
  el.textContent = text;
}
$('#joinForm').addEventListener('submit', e => {
  e.preventDefault();
  if (joining || joined) return;
  const name = $('#name').value.trim(); if (!name) return;
  myName = name;
  try { localStorage.setItem('linhung-name', name); } catch { /* bỏ qua */ }
  sfx.init(); templeMusic.init(); sfx.chime(0.6);
  joining = true;
  socket.emit('join', { name, color: robe });
});
socket.on('full', () => { joining = false; showJoinMsg('Chùa đang quá đông, xin thử lại sau ít phút.'); });

socket.on('init', d => {
  timeOffset = d.now - Date.now();
  const first = !joined;
  for (const id of [...players.keys()]) removePlayer(id);
  selfId = d.selfId; d.players.forEach(createPlayer); me = players.get(selfId);
  d.incense.forEach(life.addIncense);
  $('#count').textContent = d.players.length;
  if (first) camYaw = 0;
  else toast('🙏 Đã kết nối lại với chùa');
  meditating = false; updateSitUI();                      // vào lại thì đứng dậy (server cấp người chơi mới)
  joined = true; joining = false;
  if (first) {
    $('#join').classList.add('leaving'); setTimeout(() => $('#join').remove(), 900);
    $('#hud').hidden = false;
    addMsg(null, 'Nam mô A Di Đà Phật 🙏 Chúc bạn một ngày an lạc.');
    setTimeout(() => toast('Đi thẳng lên <b>đại bậc thang</b> để vào Chánh điện, rẽ phải để ngắm <b>Phật Bà Quán Thế Âm</b>'), 1500);
    setTimeout(() => toast('Bấm nút <b>🙏 Thao tác</b> để lễ Phật, ngồi thiền. Đứng gần chỗ tương tác sẽ có nút to hiện ra'), 5000);
  }
});
socket.on('joined', createPlayer);
socket.on('left', removePlayer);
socket.on('count', n => { $('#count').textContent = n; });
socket.on('system', t => addMsg(null, t));
socket.on('notice', t => { if (joined) toast(esc(t)); else showJoinMsg(t); });
socket.on('moved', d => { const o = players.get(d.id); if (o) { o.target.set(d.x, 0, d.z); o.targetRy = d.ry; o.moving = d.moving; } });
socket.on('sit', d => { const o = players.get(d.id); if (o && o !== me) o.sitting = !!d.on; });
socket.on('ride', d => {
  const o = players.get(d.id); if (!o) return;
  startRide(o, d);
  if (o === me) toast('🚡 Cáp treo đang đưa bạn xuống chùa · ngắm biển mây nhé');
});
socket.on('rideEnd', d => {
  const o = players.get(d.id); if (!o) return;
  endRide(o, d.x, d.z, d.ry);
  if (o === me) { camSnap = true; toast('🙏 Đã xuống tới chân núi · bước vào cổng để về chùa'); }
});
socket.on('incense', life.addIncense);
socket.on('lantern', l => life.addLantern(l));
socket.on('chat', m => { addMsg(m.name, m.text, m.color); const o = players.get(m.id); if (o) showBubble(o, m.text); });
socket.on('weather', d => {
  if (!d || !PRESETS[d.key]) return;
  weather.set(d.key); setWeatherUI();
  if (joined) {
    toast(`Trời chuyển: <b>${esc(PRESETS[d.key].label)}</b>`);
    if (d.by) addMsg(null, `🙏 ${d.by} khấn cầu Phật Bà, trời chuyển ${PRESETS[d.key].label}`);
  }
});

const volAt = (x, z, range = 60) => me ? Math.max(0, 1 - Math.hypot(me.root.position.x - x, me.root.position.z - z) / range) : 0.3;
const inHallAt = (x, z) => Math.abs(x) < 18 && z < -16 && z > -36;

function bowMessage() {
  const p = me.root.position;
  if (Math.hypot(p.x - STATUE.x, p.z - STATUE.z) < 34) return '🙏 Đảnh lễ Phật Bà Quán Thế Âm · sóng yên biển lặng';
  if (inHallAt(p.x, p.z)) return '🙏 Thành tâm đảnh lễ Tam Bảo';
  return '🙏 Thành tâm đảnh lễ';
}
const anim = { bell: 0, drum: 0, mo: 0 };
socket.on('action', d => {
  setMerit(d.merit, !d.npc);
  const o = players.get(d.id);
  if ((d.type === 'bow' || d.type === 'incenseTop') && o) o.bow = 1;
  if (d.type === 'bell') { anim.bell = 1; sfx.bell(volAt(BELL.x, BELL.z, 90)); }
  if (d.type === 'drum') { anim.drum = 1; sfx.drum(volAt(DRUM.x, DRUM.z, 70)); }
  if (d.type === 'mo') { anim.mo = 1; sfx.mo(volAt(MO_PLAYER.x, MO_PLAYER.z, 30)); }
  if (d.type === 'incense') life.burst();
  if (d.id === selfId) {
    const msg = {
      bow: bowMessage(), bell: '🔔 Tiếng chuông ngân xa…', drum: '🥁 Tùng! Trống vang khắp núi', mo: '🪵 Cốc! Tâm tịnh ý an',
      incense: '🪔 Nén nhang thơm dâng lên', incenseTop: '🪔 Dâng hương Chùa Đồng, nguyện cầu bình an, tài lộc, sức khỏe', lantern: '🏮 Hoa đăng nở trên hồ sen, gửi lời nguyện ước',
      meditate: '🧘 Hơi thở nhẹ, tâm lặng như hồ sen'
    }[d.type];
    toast(`${msg} · <b>+1 công đức</b>`);
  }
});
life.onAutoBell = () => {
  anim.bell = 1; sfx.bell(volAt(BELL.x, BELL.z, 120) * 0.9);
  if (joined) toast('🔔 Chú tiểu thỉnh chuông – hãy dừng lại, hít thở sâu');
};

/* ====================== ĐIỀU KHIỂN ====================== */
const keys = {};
let camYaw = 0, camPitch = 0.3, camDist = 9.5;
let viewTilt = 0;            // ngước nhìn lên (rad): kéo chuột lên quá giới hạn để xem đầu tượng Quán Thế Âm
let nearSpot = null;
let camSnap = false;
let hintedLookUp = false, hintedSit = false, hintedHall = false, hintedSummit = false;
let meditating = false;      // mình đang ngồi thiền
let eyeH = 1.5;              // độ cao điểm nhìn của camera so với chân nhân vật (thấp xuống khi ngồi)

function updateSitUI() {
  const b = document.querySelector('.act[data-act="meditate"]');
  b.classList.toggle('on', meditating);
  b.querySelector('.lbl').textContent = meditating ? 'Đứng dậy' : 'Ngồi thiền';
}

/* Ngồi thiền / đứng dậy. Trong chánh điện tự ngồi lên bồ đoàn gần nhất, quay mặt về bàn thờ. */
function setSitting(on) {
  if (!joined || !me || on === meditating) return;
  meditating = on; me.sitting = on;
  updateSitUI();
  if (socket.connected) socket.emit('sit', on);
  if (on) {
    sfx.chime(0.3);
    const p = me.root.position, c = cushionNear(p.x, p.z);
    if (c) {
      const ry = c.ry ?? Math.PI;                         // chánh điện: quay về bàn thờ; thiền đài: quay vào tâm đài
      p.x = c.x; p.z = c.z; me.targetRy = ry;
      socket.volatile.emit('move', { x: p.x, z: p.z, ry, moving: false });
    }
    if (!hintedSit) { hintedSit = true; toast(isTouch ? 'Bấm <b>Thao tác → Đứng dậy</b> hoặc bước đi để xả thiền' : 'Nhấn <b>T</b>, bấm nút <b>Đứng dậy</b> hoặc bước đi để xả thiền'); }
  }
}

/* ---- sân đỉnh: ngắm mây, check-in, tử vi, cáp treo ---- */
const VIEW_MSG = {
  binhminh: '🌅 Mặt trời nhô lên từ biển Đông, biển mây nhuộm hồng dưới chân bạn',
  hoanghon: '🌇 Hoàng hôn rót vàng lên biển mây, gió dịu dần',
  nang: '☁️ Mây trắng cuộn dưới chân, nắng trải xuống mặt biển xa tít',
  may: '☁️ Trời âm u, mây nối liền trời. Bạn đang đứng giữa mây',
  mua: '🌧️ Mưa trút dưới thung, trên đỉnh chỉ còn tiếng gió và tiếng mưa',
  giong: '⛈️ Giông kéo dưới chân núi, thỉnh thoảng sét lóe trong mây',
  suong: '🌫️ Sương phủ kín, mọi thứ như tan vào mây',
  dem: '🌙 Trăng sáng trên biển mây, đêm núi tĩnh lặng',
  tuyet: '❄️ Tuyết rơi trên đỉnh núi, biển mây lặng im dưới ánh đèn lồng'
};
let hintedCloud = false, photoTimer = 0;
function doView() {
  const k = weather.key;
  toast(VIEW_MSG[k] || VIEW_MSG.nang);
  if (!hintedCloud && k !== 'binhminh' && k !== 'hoanghon') {
    hintedCloud = true;
    setTimeout(() => toast('Mở menu thời tiết, chọn <b>🌅 Bình minh</b> hoặc <b>🌇 Hoàng hôn</b> để săn mây thấu kính'), 1700);
  }
}
function doPhoto() {
  const on = !document.body.classList.contains('photo');
  document.body.classList.toggle('photo', on);
  clearTimeout(photoTimer);
  if (on) photoTimer = setTimeout(() => { document.body.classList.remove('photo'); toast(isTouch ? '📸 Check-in xong! Chạm vào màn hình khi đang chụp để hiện lại giao diện sớm hơn' : '📸 Check-in xong! Nhấn <b>H</b> bất cứ lúc nào để ẩn giao diện chụp ảnh'); }, 10000);
}
function doCable() {
  if (me.ride) return;
  setSitting(false);
  socket.emit('cable');
}

const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
function openFortune() {
  if (nearSpot?.type !== 'fortune') return toast('Hãy lại gần Tử Vi Đường');
  setSitting(false);
  $('#fortune').hidden = false;
  try { $('#fortuneYear').value = localStorage.getItem('linhung-year') || ''; } catch { /* chế độ riêng tư */ }
  $('#fortuneResult').innerHTML = '';
  $('#fortuneYear').focus();
}
function closeFortune() { $('#fortune').hidden = true; $('#fortuneYear').blur(); }
$('#fortuneClose').addEventListener('click', closeFortune);
$('#fortuneForm').addEventListener('submit', e => {
  e.preventDefault();
  const year = Number($('#fortuneYear').value);
  if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear()) return toast('Hãy nhập năm sinh dương lịch, ví dụ 1990');
  try { localStorage.setItem('linhung-year', String(year)); } catch { /* bỏ qua */ }
  socket.emit('fortune', { year });
});
socket.on('fortune', f => {
  const row = (label, n) => `<div class="fz-row"><span>${label}</span><b>${stars(n)}</b></div>`;
  $('#fortuneResult').innerHTML =
    `<div class="fz-head"><b>${esc(f.can)} ${esc(f.chi)}</b> · tuổi ${esc(f.animal)} · hành ${esc(f.hanh)}</div>` +
    row('Tài lộc', f.stars.tai) + row('Công việc', f.stars.viec) + row('Sức khỏe', f.stars.khoe) + row('Tình duyên · gia đạo', f.stars.tinh) +
    `<p class="fz-lucky">Màu hợp: <b>${esc(f.mau)}</b> · Số may mắn: <b>${f.so}</b><br>Giờ tốt trong ngày: <b>${esc(f.gio)}</b></p>` +
    `<p class="fz-advice">“${esc(f.advice)}”</p>` +
    `<small>Tử vi ngày ${esc(f.day)} · chỉ mang tính giải trí. Làm việc lành mỗi ngày mới là điều giữ được vận.</small>`;
});

function doAction(type) {
  if (!joined || me?.ride) return;
  if (type === 'meditate') return setSitting(!meditating);
  if (type === 'view' || type === 'photo') return nearSpot?.type === type ? (type === 'view' ? doView() : doPhoto()) : undefined;
  if (!socket.connected) return toast('Mất kết nối, đang thử lại…');
  if (type !== 'bow' && (!nearSpot || nearSpot.type !== type)) return toast('Hãy lại gần để ' + esc(W.spots.find(s => s.type === type).text));
  if (type === 'fortune') return openFortune();
  if (type === 'cable') return doCable();
  if (type !== 'bow') setSitting(false);                 // đứng dậy trước khi đánh chuông, trống, thắp nhang…
  socket.emit('action', { type });
}
const SPOT_ICON = {
  incense: '🪔', bell: '🔔', drum: '🥁', mo: '🪵', lantern: '🏮', incenseTop: '🪔',
  fortune: '🔮', meditate: '🧘', view: '🌄', photo: '📸', cable: '🚡'
};

/* Hàng nút thao tác (lễ Phật, ngồi thiền, thắp nhang…) thu gọn sau nút "Thao tác", bấm vào mới mở ra; làm xong thì tự thu lại. */
const dock = $('#dock');
function setDock(open) {
  dock.classList.toggle('open', open);
  $('#actToggle').setAttribute('aria-expanded', String(open));
  $('#actToggle .lbl').textContent = open ? 'Thu gọn' : 'Thao tác';
}
$('#actToggle').addEventListener('click', () => setDock(!dock.classList.contains('open')));
document.querySelectorAll('.act').forEach(b => b.addEventListener('click', () => { doAction(b.dataset.act); setDock(false); }));
$('#prompt').addEventListener('click', () => { if (nearSpot) doAction(nearSpot.type); });   // nút ngữ cảnh: thay phím E, dùng được trên điện thoại

addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') { if (e.key === 'Escape') { e.target.blur(); closeFortune(); } return; }
  if (!joined) return;
  if (!$('#fortune').hidden) { if (e.key === 'Escape') closeFortune(); return; }       // đang mở bảng tử vi thì không điều khiển nhân vật
  const k = e.key.toLowerCase();
  if (e.key === 'Enter') { e.preventDefault(); $('#chatInput').focus(); return; }
  keys[k] = true;
  if (k === 'e' && !e.repeat) nearSpot ? doAction(nearSpot.type) : toast('Không có gì để tương tác ở đây');
  if (k === 'b' && !e.repeat) doAction('bow');
  if (k === 't' && !e.repeat) doAction('meditate');
  if (k === 'h' && !e.repeat) document.body.classList.toggle('photo');
  if (k === ' ') e.preventDefault();
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

$('#chatForm').addEventListener('submit', e => {
  e.preventDefault(); const v = $('#chatInput').value.trim();
  if (v) socket.emit('chat', v);
  $('#chatInput').value = ''; $('#chatInput').blur();
});

/* kéo để xoay camera, một ngón; hai ngón chụm để zoom */
const pointers = new Map(); let pinch = 0;
canvas.addEventListener('pointerdown', e => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  canvas.setPointerCapture(e.pointerId); $('#weatherMenu').hidden = true; setDock(false);
  if (isTouch && document.body.classList.contains('photo')) { clearTimeout(photoTimer); document.body.classList.remove('photo'); }   // chạm màn hình để thoát chế độ chụp ảnh
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
});
canvas.addEventListener('pointermove', e => {
  const p = pointers.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (pointers.size >= 2) {
    const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
    camDist = clamp(camDist - (d - pinch) * 0.04, 4, 30); pinch = d;
  } else {
    camYaw -= dx * 0.006;
    const dp = dy * 0.004;                                   // dp > 0: kéo xuống
    if (dp < 0 && camPitch <= 0.06) viewTilt = clamp(viewTilt - dp, 0, 1.4);
    else if (dp > 0 && viewTilt > 0) viewTilt = Math.max(0, viewTilt - dp);
    else camPitch = clamp(camPitch + dp, 0.05, 1.2);
  }
});
const endPointer = e => { pointers.delete(e.pointerId); pinch = 0; };
canvas.addEventListener('pointerup', endPointer); canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('wheel', e => { camDist = clamp(camDist + e.deltaY * 0.01, 4, 30); }, { passive: true });

const stick = $('#stick'), knob = stick.querySelector('.knob'), joy = { x: 0, y: 0, id: null };
function moveJoy(e) {
  const r = stick.getBoundingClientRect(); let dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2;
  const l = Math.hypot(dx, dy), m = 40; if (l > m) { dx *= m / l; dy *= m / l; }
  joy.x = dx / m; joy.y = dy / m; knob.style.transform = `translate(${dx}px,${dy}px)`;
}
const endJoy = () => { joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
stick.addEventListener('pointerdown', e => { joy.id = e.pointerId; stick.setPointerCapture(e.pointerId); moveJoy(e); });
stick.addEventListener('pointermove', e => { if (e.pointerId === joy.id) moveJoy(e); });
stick.addEventListener('pointerup', endJoy); stick.addEventListener('pointercancel', endJoy);

/* ====================== VÒNG LẶP ====================== */
const onSummit = (x, z) => z < -380 && PLAZA_DISCS.some(D => Math.hypot(x - D.x, z - D.z) <= D.r + 0.5);   // trên sân đỉnh (kể cả hai đài)
const ZONES = [
  { test: () => !!me?.ride, name: 'Cáp treo Đỉnh Mây', sub: 'Trượt xuống chùa, ngắm biển mây từ trên cao' },
  { test: (x, z) => inHallAt(x, z), name: 'Đại Hùng Bảo Điện', sub: 'Thích Ca · Quán Thế Âm · Địa Tạng' },
  { test: (x, z) => Math.hypot(x - BELL.x, z - BELL.z) < 6, name: 'Gác chuông', sub: 'Một tiếng chuông, vạn điều an' },
  { test: (x, z) => Math.hypot(x - DRUM.x, z - DRUM.z) < 6, name: 'Gác trống', sub: 'Tiếng trống thức tỉnh tâm mê' },
  ...SUMMIT_ZONES.map(s => ({ name: s.name, sub: s.sub, test: (x, z) => onSummit(x, z) && (s.x === undefined || Math.hypot(x - s.x, z - s.z) < s.r) })),
  { test: (x, z) => x > LOWER_PAD.x1 && x < LOWER_PAD.x2 && z > LOWER_PAD.z1 + 2.5 && z < LOWER_PAD.z2, name: 'Ga cáp treo chân núi', sub: 'Về lại chùa · Nam mô A Di Đà Phật' },
  { test: (x, z) => x < -41 && stairQuery(x, z, 1) !== null, name: 'Đường Mây · 1.080 bậc', sub: 'Đi chậm thôi, mỗi bước một câu niệm Phật' },
  { test: (x, z) => x > 24.5 && z < -65.3, name: 'Trai đường', sub: 'Ăn cơm trong chánh niệm, nhớ ơn người dâng cúng' },
  { test: (x, z) => Math.abs(x - 26.1) < 5.5 && Math.abs(z + 50) < 13, name: 'Nhà Trù', sub: 'Công quả là tu, một nồi cơm cũng là hành đạo' },
  { test: (x, z) => z <= 0 && Math.abs(x) > 30, name: 'Hành lang', sub: 'Bước chậm, nghe gió qua mái ngói' },
  { test: (x, z) => z < -64, name: 'Nhà Tổ', sub: 'Chốn tĩnh tu của chư Tăng' },
  { test: (x, z) => z < -38, name: 'Sân sau', sub: 'Lùi lại sau chánh điện, nghe gió từ núi Sơn Trà' },
  { test: (x, z) => z <= 0, name: 'Sân lư hương', sub: 'Chư Tăng đang kinh hành' },
  { test: (x, z) => z < 10.5 && Math.abs(x) < 7.5, name: 'Đại bậc thang', sub: 'Mỗi bậc một lần buông bỏ' },
  { test: (x, z) => Math.hypot(x - STATUE.x, z - STATUE.z) < 31, name: 'Đài Quán Thế Âm', sub: 'Phật Bà nhìn ra biển Đông, che chở ngư dân' },
  { test: (x, z) => Math.hypot(x - BODHI.x, z - BODHI.z) < 13, name: 'Gốc bồ đề', sub: 'Chú tiểu đang quét lá' },
  { test: (x, z) => Math.hypot(x - POND.x, z - POND.z) < 11, name: 'Hồ sen', sub: 'Gần bùn mà chẳng hôi tanh' },
  { test: (x, z) => z > 51.5 && Math.abs(x) < 10, name: 'Cổng Tam Quan', sub: 'Linh ứng sở cầu như ý nguyện' },
  { test: (x, z) => z > 49 && x > 11, name: 'Đài ngắm biển', sub: 'Biển Đông, Cù Lao Chàm, vịnh Đà Nẵng' },
  { test: (x, z) => z > 11 && Math.abs(x) < 13, name: 'Vườn La Hán', sub: 'Mười tám vị, mười tám sắc thái' },
  { test: () => true, name: 'Sân chùa', sub: 'Hít thở sâu, bước chậm' }
];
let zoneName = '', lastSend = 0, wasMoving = false, ambientT = 3;
let stairTitle = '', stairSub = '', lastLanding = -1;
const WALK_SPEED = 4.0;   // m/s khi đi bộ trên đường bằng; giữ Shift thì chạy nhanh gấp 1,75 lần
const CLIMB_SPEED = 3.2;  // tốc độ gốc dùng để tính lúc leo dốc/bậc thang, giữ nguyên như trước để bậc thang không nhanh lên
const clock = new THREE.Clock();
const tmp = new THREE.Vector3(), focus = new THREE.Vector3(30, 0, 20), camTarget = new THREE.Vector3();
const moRest = new THREE.Vector3(1.1, 0.8, 0.9);

function update(dt, t) {
  const st = sNow();
  const env = weather.cur;

  /* --- người chơi của mình --- */
  if (joined && me) {
    let f = 0, r = 0;
    if (keys.w || keys.arrowup) f++; if (keys.s || keys.arrowdown) f--;
    if (keys.d || keys.arrowright) r++; if (keys.a || keys.arrowleft) r--;
    if (joy.id !== null) { f -= joy.y; r += joy.x; }
    const mag = Math.min(1, Math.hypot(f, r)), moving = mag > 0.1 && !me.ride;      // đang ngồi cáp treo thì không tự đi
    const p = me.root.position;
    if (moving && meditating) setSitting(false);           // bấm phím đi là xả thiền
    if (moving) {
      const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
      let mx = fx * f + rx * r, mz = fz * f + rz * r; const l = Math.hypot(mx, mz) || 1; mx /= l; mz /= l;
      let speed = (keys.shift ? WALK_SPEED * 1.75 : WALK_SPEED) * mag * dt;
      const h0 = heightAt(p.x, p.z);
      // lên dốc/bậc thang thì chậm lại theo độ dốc (đại bậc thang dốc ~0,48 -> còn khoảng một nửa).
      // Trên dốc/bậc thang dùng tốc độ gốc CLIMB_SPEED nên đường bằng nhanh lên còn bậc thang giữ nguyên như cũ, cả lúc lên lẫn lúc xuống.
      const rise = (heightAt(p.x + mx * speed, p.z + mz * speed) - h0) / Math.max(speed, 1e-6);
      const climb = (keys.shift ? CLIMB_SPEED * 1.75 : CLIMB_SPEED) * mag * dt;
      if (rise > 0.02) speed = Math.min(speed, climb * clamp(1 - rise * 1.1, 0.4, 1));
      else if (rise < -0.02) speed = Math.min(speed, climb);
      if (!blocked(p.x + mx * speed, p.z, h0)) p.x += mx * speed;
      const h1 = heightAt(p.x, p.z);
      if (!blocked(p.x, p.z + mz * speed, h1)) p.z += mz * speed;
      me.targetRy = Math.atan2(mx, mz);
    }
    me.root.rotation.y = lerpAngle(me.root.rotation.y, me.targetRy, Math.min(1, dt * 12));
    me.moving = moving;
    if ((moving || wasMoving) && t - lastSend > 0.05) {
      socket.volatile.emit('move', { x: p.x, z: p.z, ry: me.root.rotation.y, moving });   // volatile: bỏ gói khi đang mất mạng
      lastSend = t; wasMoving = moving;
    }

    nearSpot = me.ride ? null : W.spots.find(s => Math.hypot(p.x - s.x, p.z - s.z) < s.r) || null;
    const pr = $('#prompt');
    if (nearSpot) {
      // nút ngữ cảnh thay cho phím E: hiện biểu tượng + việc có thể làm tại chỗ đang đứng
      const label = nearSpot.type === 'meditate' && meditating ? 'Đứng dậy' : nearSpot.text.charAt(0).toUpperCase() + nearSpot.text.slice(1);
      const html = `<span class="ico">${SPOT_ICON[nearSpot.type] || '✨'}</span><span>${esc(label)}</span>${isTouch ? '' : '<kbd>E</kbd>'}`;
      if (pr.dataset.k !== html) { pr.innerHTML = html; pr.dataset.k = html; }
      pr.classList.add('show');
    } else pr.classList.remove('show');
    const inHall = inHallAt(p.x, p.z), nearStatue = Math.hypot(p.x - STATUE.x, p.z - STATUE.z) < 34;
    document.querySelectorAll('.act').forEach(b => {
      const a = b.dataset.act, always = a === 'bow' || a === 'meditate';   // luôn dùng được ở mọi nơi trong chùa
      b.classList.toggle('near', nearSpot?.type === a || (always && inHall) || (a === 'bow' && nearStatue));
      b.disabled = !always && nearSpot?.type !== a;
    });
    const z = ZONES.find(z => z.test(p.x, p.z));
    if (z.name !== zoneName) {
      zoneName = z.name; $('#zone').textContent = z.name; $('#zoneSub').textContent = z.sub;
      stairTitle = stairSub = '';
      if (z.name === 'Đài Quán Thế Âm' && !hintedLookUp) {
        hintedLookUp = true;
        setTimeout(() => toast('Kéo chuột (hoặc vuốt) <b>lên trên</b> để ngước nhìn Phật Bà cao 67 m'), 1200);
      }
      if (onSummit(p.x, p.z) && !hintedSummit) {
        hintedSummit = true;
        toast('🌄 Bạn đã lên tới <b>đỉnh Đường Mây</b> sau 1.080 bậc. Nam mô A Di Đà Phật.');
        setTimeout(() => toast('Muốn xuống nhanh? Ra <b>ga cáp treo</b> ở góc tây nam sân'), 3600);
      }
      if (z.name === 'Đại Hùng Bảo Điện' && !hintedHall) {
        hintedHall = true;
        setTimeout(() => toast(isTouch ? 'Bấm <b>Thao tác → Ngồi thiền</b> để ngồi thiền trên bồ đoàn' : 'Nhấn <b>T</b> để ngồi thiền trên bồ đoàn'), 1200);
      }
    }

    // Đường Mây: hiển thị chặng và số bậc đã đi, nhắc nghỉ chân ở mỗi sân nghỉ
    const sp = z.name.startsWith('Đường Mây') ? stairProgress(p.x, p.z) : null;
    if (sp) {
      const title = `Đường Mây · Chặng ${sp.stage}/${PILGRIM.stages}`, sub = `Bậc ${sp.step}/${PILGRIM.steps}${sp.landing && sp.step > 0 ? ' · sân nghỉ' : ''}`;
      if (title !== stairTitle) { stairTitle = title; $('#zone').textContent = title; }
      if (sub !== stairSub) { stairSub = sub; $('#zoneSub').textContent = sub; }
      if (sp.landing && sp.landingIndex > 0 && sp.landingIndex !== lastLanding) {
        lastLanding = sp.landingIndex;
        toast(sp.landingIndex === PILGRIM.stages
          ? '🌄 Bạn đã lên tới <b>đỉnh Đường Mây</b> sau 1.080 bậc. Nam mô A Di Đà Phật.'
          : `🪷 Xong <b>chặng ${sp.landingIndex}</b> (bậc ${sp.step}/1.080). Dừng lại, hít thở sâu rồi đi tiếp, đi chậm thôi.`);
      }
    }

    // camera bám theo (hạ thấp điểm nhìn khi ngồi thiền)
    eyeH += ((meditating ? 1.05 : 1.5) - eyeH) * Math.min(1, dt * 5);
    const ty = p.y + eyeH;
    tmp.set(p.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist, ty + Math.sin(camPitch) * camDist, p.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist);
    const onMountain = tmp.x < -41 || tmp.z < -76;
    tmp.y = Math.max(tmp.y, Math.max(heightAt(tmp.x, tmp.z), onMountain ? terrainHeight(tmp.x, tmp.z) : -Infinity) + 0.6);   // không chui xuống sườn núi khi leo Đường Mây và trên đỉnh
    if (inHall) tmp.y = Math.min(tmp.y, POD + 8);
    if (camSnap) { camera.position.copy(tmp); camSnap = false; }
    else camera.position.lerp(tmp, 1 - Math.exp(-dt * 7));
    camera.lookAt(p.x, ty + Math.tan(viewTilt) * camDist * Math.cos(camPitch), p.z);
    focus.set(p.x, p.y, p.z);
  } else {
    // màn hình chờ: camera bay vòng từ phía biển nhìn vào chùa và tượng Quán Thế Âm
    const th = Math.PI / 2 + 0.85 * Math.sin(t * 0.05);
    camera.position.set(22 + Math.cos(th) * 112, 26 + Math.sin(t * 0.13) * 6, 18 + Math.sin(th) * 112);
    camTarget.set(isTouch ? 30 : 22, 24, 6);
    camera.lookAt(camTarget);
    focus.set(30, 0, 20);
  }

  /* --- mọi người chơi --- */
  for (const o of players.values()) {
    if (o.ride) rideStep(o, st, t);                          // ngồi trong cabin: vị trí theo giờ server
    else if (o !== me) {
      o.root.position.x += (o.target.x - o.root.position.x) * Math.min(1, dt * 10);
      o.root.position.z += (o.target.z - o.root.position.z) * Math.min(1, dt * 10);
      o.root.rotation.y = lerpAngle(o.root.rotation.y, o.targetRy, Math.min(1, dt * 10));
    }
    if (o.sitting !== o.seatedPose) o.setSeated(o.sitting);
    const p = o.root.position;
    if (!o.ride) p.y += (heightAt(p.x, p.z) + (o.sitting ? seatLiftAt(p.x, p.z) : 0) - p.y) * Math.min(1, dt * 14);
    // nhịp chân theo tốc độ thực tế (m/s), nên đi chậm hay leo bậc thang thì chân bước chậm theo, không trượt
    const vNow = Math.hypot(p.x - (o.px ?? p.x), p.z - (o.pz ?? p.z)) / Math.max(dt, 1e-3);
    o.px = p.x; o.pz = p.z; o.vel = (o.vel ?? vNow) + (vNow - (o.vel ?? vNow)) * Math.min(1, dt * 8);
    o.walk = o.moving ? o.walk + dt * clamp(o.vel * 1.7, 3.5, 11) : 0;
    o.body.position.y = o.moving ? Math.abs(Math.sin(o.walk)) * 0.025 : 0;
    if (o.sitting) o.dhyana();
    else if (o.moving) { o.step(o.walk); o.walkArms(o.walk); }
    else { o.step(0, 0); o.anjali(); }
    const lean = o.sitting ? 0.05 : 0;                       // ngồi thiền: lưng thẳng, đầu hơi cúi
    if (o.bow > 0) {
      o.bow = Math.max(0, o.bow - dt * 0.7);
      o.upper.rotation.x = lean + Math.sin((1 - o.bow) * Math.PI) * 0.95;
      o.neck.rotation.x = Math.sin((1 - o.bow) * Math.PI) * 0.25;
    } else { o.upper.rotation.x = lean; o.neck.rotation.x = o.sitting ? 0.1 : 0; }
    if (o.work) updateWork(o, t);                            // ghi đè tay, lưng, mắt bằng động tác công quả
    o.idle(dt, t);
    if (o.bubble) {
      o.bubbleT -= dt; o.bubble.material.opacity = Math.min(1, o.bubbleT);
      if (o.bubbleT <= 0) { o.root.remove(o.bubble); o.bubble.userData.dispose?.(); o.bubble = null; }
    }
  }

  /* --- hoạt cảnh & thời tiết --- */
  life.update(dt, st, t, env, me, focus);
  weather.update(dt, t, camera.position, focus);
  terrain.update(dt, env);

  const night = env.night;
  M.LANTERN.emissiveIntensity = 0.5 + night * 2.8;
  W.lights.forEach(l => { l.intensity = l.userData.base * Math.max(0, night - 0.1) * 1.3 + (l.userData.always || 0) * (0.4 + night * 0.6); });
  M.BGOLD.emissiveIntensity = 0.45 + night * 1.2 + Math.sin(t * 1.4) * 0.12;
  STATUE_MATS.HOOD.emissiveIntensity = M.BGOLD.emissiveIntensity;
  M.HALO.emissiveIntensity = 1.2 + night * 1.3 + Math.sin(t * 1.4 + 1) * 0.25;
  M.PEARL.emissiveIntensity = 1.4 + night * 1.2;
  M.MARBLE.emissiveIntensity = night * 0.3;
  STATUE_MATS.LOTUS.emissiveIntensity = night * 0.35;
  bloom.strength = 0.25 + night * 0.6 + env.storm * 0.1;
  W.lanterns.update(t, env.wind);
  sfx.setRain(env.rain);
  sfx.setWind(env.wind / 2);
  if (me) {
    const p = me.root.position, edge = p.z > 0 ? Math.min(57 - p.z, 92 - p.x) : 99;
    sfx.setSea(clamp(1 - edge / 45, 0.1, 1) * (1 - env.mist * 0.2));
    // nhạc chùa: nghe rõ trong chánh điện, ra ngoài thì nhỏ dần theo khoảng cách tới điện
    const hd = Math.hypot(Math.max(0, Math.abs(p.x) - 18), p.z < -36 ? -36 - p.z : Math.max(0, p.z + 16));
    templeMusic.setLevel(hd === 0 ? 1 : 0.85 * Math.exp(-hd / 26), dt);
  }

  // chuông / trống / mõ
  if (anim.bell > 0) {
    anim.bell = Math.max(0, anim.bell - dt * 0.3);
    W.anim.bellPivot.rotation.z = Math.sin(t * 5) * 0.08 * anim.bell;
    W.anim.bellStriker.rotation.z = Math.max(0, Math.sin((1 - anim.bell) * 25)) * 0.35 * anim.bell;
  }
  if (anim.drum > 0) { anim.drum = Math.max(0, anim.drum - dt * 3); W.anim.drum.scale.setScalar(1 + anim.drum * 0.05); }
  if (anim.mo > 0) { anim.mo = Math.max(0, anim.mo - dt * 4); W.anim.mo.scale.set(1.1 + anim.mo * 0.12, 0.8 - anim.mo * 0.1, 0.9); } else W.anim.mo.scale.copy(moRest);
  W.anim.kitchen?.update(t, dt);
  W.anim.dining?.update(t, dt);
  W.anim.pilgrim?.update(camera, env, t, dt);
  W.anim.summit?.update(camera, env, t, dt);
  W.cable?.update(st, t);
  W.anim.flames?.forEach((f, i) => f.scale.set(1 + Math.sin(t * 17 + i) * 0.1, 1.8 + Math.sin(t * 13 + i) * 0.3, 1));

  // âm thanh môi trường
  ambientT -= dt;
  if (ambientT <= 0 && sfx.ready()) {
    ambientT = 2 + Math.random() * 5;
    if (env.birds > 0.5 && env.rain < 0.2) { Math.random() < 0.65 ? sfx.chirp(0.4 + Math.random() * 0.4) : sfx.gull(0.4 + Math.random() * 0.4); }
    else if (night > 0.7 && env.rain < 0.2 && env.snow < 0.2) sfx.cricket(0.6);
  }
}

let frames = 0;
function loop() {
  const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
  update(dt, t);
  if (DEV) renderer.info.reset();
  composer.render();
  if (++frames === 3) $('#loading').classList.add('done');
  requestAnimationFrame(loop);
}
loop();

function onResize() {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', onResize);

/* Công cụ gỡ lỗi: thêm ?dev=1 vào địa chỉ. */
if (DEV) {
  window.__dev = {
    goto(x, z) { if (me) { me.root.position.set(x, heightAt(x, z), z); camSnap = true; } },
    cam(yaw, pitch, dist, tilt = 0) { camYaw = yaw; camPitch = pitch; camDist = dist; viewTilt = tilt; camSnap = true; },
    /* dịch chuyển người chơi và đặt camera ngay lập tức, rồi báo lên server để các spot hoạt động */
    snap(x, z, yaw, pitch, dist, ry, tilt = 0) {
      if (!me) return;
      me.root.position.set(x, heightAt(x, z), z); if (ry !== undefined) { me.root.rotation.y = ry; me.targetRy = ry; }
      camYaw = yaw; camPitch = pitch; camDist = dist; viewTilt = tilt; camSnap = true;
      socket.volatile.emit('move', { x, z, ry: me.root.rotation.y, moving: false });
    },
    weather(k) { weather.set(k, true); setWeatherUI(); },
    terrainHeight, heightAt, W,
    state: () => ({ joined, sitting: meditating, pos: me && me.root.position.toArray(), zone: zoneName, players: players.size, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures }),
    act(type) { doAction(type); },
    socketDrop() { socket.io.engine.close(); },          // giả lập đứt mạng: socket.io tự nối lại
    selfId: () => selfId,
    renderer, scene, camera
  };
}
