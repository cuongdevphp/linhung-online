/* Âm thanh tổng hợp bằng WebAudio, không cần file mp3. */
let ctx = null, master = null, rainGain = null, seaGain = null, windGain = null, on = true;

function noiseBuffer(sec) {
  const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

/* Vòng lặp tiếng ồn qua bộ lọc, trả về nút gain cuối để chỉnh âm lượng. */
function noiseLoop(type, freq, q = 0.7) {
  const src = ctx.createBufferSource(); src.buffer = noiseBuffer(3); src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.value = 0;
  src.connect(f).connect(g); src.start();
  return { gain: g, filter: f };
}

/* ---------- Nhạc chùa: drone trầm + giai điệu ngũ cung thưa + tiếng chuông xoay (singing bowl) ----------
 * Toàn bộ đi qua một bus riêng (vang -> lọc thông thấp -> gain), nên chỉ cần chỉnh setTemple(level)
 * là vừa nhỏ dần vừa bị "bịt" dần, giống tiếng nhạc vọng từ xa. */
const D2 = 73.416;                       // nốt Rê trầm
const PENTA = [0, 2, 4, 7, 9];           // Rê Mi Fa# La Si
const noteHz = i => D2 * 2 ** ((24 + 12 * Math.floor(i / 5) + PENTA[i % 5]) / 12);   // i: 0..9 = Rê4..Si5
let musicBus = null, musicGain = null, musicLP = null, templeLevel = 0;
let nextNote = 0, nextBowl = 0, noteIdx = 4, musicTimer = null;

function reverbBuffer(sec) {
  const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2.5;
  }
  return b;
}

function initMusic() {
  musicBus = ctx.createGain();
  const wet = ctx.createGain(); wet.gain.value = 0.55;
  const verb = ctx.createConvolver(); verb.buffer = reverbBuffer(3.2);
  musicLP = ctx.createBiquadFilter(); musicLP.type = 'lowpass'; musicLP.frequency.value = 500; musicLP.Q.value = 0.4;
  musicGain = ctx.createGain(); musicGain.gain.value = 0;
  musicBus.connect(musicLP);                 // tiếng gốc
  musicBus.connect(verb).connect(wet).connect(musicLP);   // tiếng vang
  musicLP.connect(musicGain).connect(master);

  // drone: Rê - La - Rê, mỗi âm có một bản lệch tần nhẹ cho dày và "thở"
  [[1, 0.10, 'sine'], [1.5, 0.055, 'triangle'], [2, 0.04, 'sine']].forEach(([m, g, type], i) => {
    const out = ctx.createGain(); out.gain.value = g; out.connect(musicBus);
    const lfo = ctx.createOscillator(), depth = ctx.createGain();
    lfo.frequency.value = 0.05 + i * 0.03; depth.gain.value = g * 0.35;
    lfo.connect(depth).connect(out.gain); lfo.start();
    [0, 2.5].forEach(cents => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = D2 * m; o.detune.value = cents;
      o.connect(out); o.start();
    });
  });
  musicTimer = setInterval(musicTick, 250);
}

/* Một nốt mềm (như sáo/đàn tranh gảy nhẹ): vào chậm, ngân dài. */
function softNote(freq, t, vol, dur) {
  const v = ctx.createGain();
  v.gain.setValueAtTime(0, t);
  v.gain.linearRampToValueAtTime(vol, t + 0.07);
  v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  [[1, 1], [2, 0.22], [3, 0.07]].forEach(([m, g]) => {
    const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = freq * m; og.gain.value = g;
    o.connect(og).connect(v); o.start(t); o.stop(t + dur + 0.1);
  });
  v.connect(musicBus);
}

/* Chuông xoay: hai dao động lệch ~1,5 Hz tạo nhịp "wah-wah" chậm, thêm hài âm 2,76 lần. */
function bowl(freq, t, vol) {
  const v = ctx.createGain(), dur = 9;
  v.gain.setValueAtTime(0, t);
  v.gain.linearRampToValueAtTime(vol, t + 0.6);
  v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  [[freq, 1], [freq + 1.5, 1], [freq * 2.76, 0.18], [freq * 2.76 + 2, 0.18]].forEach(([f, g]) => {
    const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = f; og.gain.value = g;
    o.connect(og).connect(v); o.start(t); o.stop(t + dur + 0.1);
  });
  v.connect(musicBus);
}

function musicTick() {
  if (!ctx || !on || templeLevel < 0.01) { nextNote = nextBowl = 0; return; }   // quá xa: không cần dựng nốt
  const now = ctx.currentTime;
  if (nextNote < now) nextNote = now + 0.1;
  if (nextBowl < now) nextBowl = now + 4 + Math.random() * 6;
  while (nextNote < now + 1) {
    // lúc thì một nốt lẻ, lúc thì một câu ngắn 2-4 nốt đi lên hoặc đi xuống
    const run = Math.random() < 0.35 ? 2 + (Math.random() * 3 | 0) : 1, dir = Math.random() < 0.5 ? -1 : 1;
    let t = nextNote;
    for (let k = 0; k < run; k++) {
      noteIdx = Math.max(0, Math.min(9, noteIdx + (k ? dir * (1 + (Math.random() < 0.25 ? 1 : 0)) : (Math.random() * 5 | 0) - 2)));
      softNote(noteHz(noteIdx), t, 0.07 + Math.random() * 0.03, 4.5);
      t += 0.55 + Math.random() * 0.25;
    }
    nextNote = t + 2.2 + Math.random() * 3.5;
  }
  if (nextBowl < now + 1) {
    bowl(noteHz([0, 3, 5][Math.random() * 3 | 0]) / 2, nextBowl, 0.05);
    nextBowl += 18 + Math.random() * 14;
  }
}

export const sfx = {
  init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = on ? 0.9 : 0; master.connect(ctx.destination);

    const rain = noiseLoop('lowpass', 1400);
    rainGain = rain.gain; rain.gain.connect(master);

    // sóng biển: tiếng ồn trầm, độ to dâng lên hạ xuống theo nhịp sóng (~9 giây một đợt)
    const sea = noiseLoop('lowpass', 520, 0.5);
    const swell = ctx.createGain(); swell.gain.value = 0.55;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11;
    const lfoDepth = ctx.createGain(); lfoDepth.gain.value = 0.4;
    lfo.connect(lfoDepth).connect(swell.gain); lfo.start();
    sea.gain.connect(swell).connect(master);
    seaGain = sea.gain;

    // gió: dải tần giữa, nhỏ
    const wind = noiseLoop('bandpass', 380, 0.8);
    windGain = wind.gain; wind.gain.connect(master);

    initMusic();
  },
  /* level 0..1: 1 là đứng trong chánh điện. Giảm dần thì nhạc nhỏ đi và bị lọc trầm (nghe như vọng từ xa). */
  setTemple(level) {
    if (!musicGain) return;
    templeLevel = level;
    const t = ctx.currentTime;
    musicGain.gain.setTargetAtTime(level * 0.9, t, 0.7);
    musicLP.frequency.setTargetAtTime(450 + 3200 * level ** 1.5, t, 0.7);
  },
  get on() { return on; },
  toggle() { on = !on; if (master) master.gain.value = on ? 0.9 : 0; return on; },
  ready: () => !!ctx,

  /* Đại hồng chung: nhiều hài âm lệch tần, ngân rất dài. */
  bell(vol = 1) {
    if (!ctx || vol < 0.02) return;
    const t = ctx.currentTime;
    [[98, 1, 9], [196.6, 0.55, 7], [235, 0.35, 5.5], [294, 0.28, 4.5], [392, 0.16, 3], [523, 0.08, 2]].forEach(([f, g, d]) => {
      const o = ctx.createOscillator(), v = ctx.createGain(); o.frequency.value = f;
      const o2 = ctx.createOscillator(), v2 = ctx.createGain(); o2.frequency.value = f * 1.004; v2.gain.value = 0.5;
      v.gain.setValueAtTime(0, t);
      v.gain.linearRampToValueAtTime(g * 0.32 * vol, t + 0.015);
      v.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(v); o2.connect(v2).connect(v); v.connect(master);
      o.start(t); o2.start(t); o.stop(t + d); o2.stop(t + d);
    });
  },
  /* Mõ gỗ: tiếng "cốc" ngắn. */
  mo(vol = 1) {
    if (!ctx || vol < 0.02) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), v = ctx.createGain(); o.type = 'triangle';
    o.frequency.setValueAtTime(760, t); o.frequency.exponentialRampToValueAtTime(400, t + 0.12);
    v.gain.setValueAtTime(0.5 * vol, t); v.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(v).connect(master); o.start(t); o.stop(t + 0.22);
  },
  /* Trống: cú đánh trầm, rơi tần nhanh, thêm chút tiếng da. */
  drum(vol = 1) {
    if (!ctx || vol < 0.02) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), v = ctx.createGain();
    o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.6);
    v.gain.setValueAtTime(0.9 * vol, t); v.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    o.connect(v).connect(master); o.start(t); o.stop(t + 1.25);
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.2);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600;
    const nv = ctx.createGain(); nv.gain.setValueAtTime(0.4 * vol, t); nv.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    n.connect(f).connect(nv).connect(master); n.start(t);
  },
  /* Ba nốt chuông nhỏ khi bước vào chùa. */
  chime(vol = 0.5) {
    if (!ctx) return;
    const t = ctx.currentTime;
    [880, 1320, 1760].forEach((f, i) => {
      const o = ctx.createOscillator(), v = ctx.createGain(); o.frequency.value = f;
      const s = t + i * 0.09;
      v.gain.setValueAtTime(0, s); v.gain.linearRampToValueAtTime(0.1 * vol, s + 0.01); v.gain.exponentialRampToValueAtTime(0.0001, s + 1.5);
      o.connect(v).connect(master); o.start(s); o.stop(s + 1.6);
    });
  },
  thunder(delay = 1, vol = 1) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(4);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(120, t + 3);
    const v = ctx.createGain();
    v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(0.9 * vol, t + 0.08); v.gain.exponentialRampToValueAtTime(0.0001, t + 3.8);
    n.connect(f).connect(v).connect(master); n.start(t);
  },
  setRain(level) { if (rainGain) rainGain.gain.setTargetAtTime(level * 0.22, ctx.currentTime, 0.8); },
  /* level 0..1: càng gần mép vực nhìn ra biển càng nghe rõ sóng. */
  setSea(level) { if (seaGain) seaGain.gain.setTargetAtTime(level * 0.2, ctx.currentTime, 0.8); },
  setWind(level) { if (windGain) windGain.gain.setTargetAtTime(Math.min(1, level) * 0.05, ctx.currentTime, 1.2); },
  chirp(vol = 0.3) {
    if (!ctx) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 2 + (Math.random() * 3 | 0); i++) {
      const s = t + i * 0.13, o = ctx.createOscillator(), v = ctx.createGain(), f0 = 2600 + Math.random() * 1400;
      o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(f0 * 1.5, s + 0.07);
      v.gain.setValueAtTime(0, s); v.gain.linearRampToValueAtTime(0.05 * vol, s + 0.01); v.gain.exponentialRampToValueAtTime(0.0001, s + 0.09);
      o.connect(v).connect(master); o.start(s); o.stop(s + 0.1);
    }
  },
  /* Hải âu kêu xa. */
  gull(vol = 0.3) {
    if (!ctx) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const s = t + i * 0.42, o = ctx.createOscillator(), v = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(1500 + i * 150, s); o.frequency.exponentialRampToValueAtTime(820, s + 0.34);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 2;
      v.gain.setValueAtTime(0, s); v.gain.linearRampToValueAtTime(0.035 * vol, s + 0.05); v.gain.exponentialRampToValueAtTime(0.0001, s + 0.4);
      o.connect(f).connect(v).connect(master); o.start(s); o.stop(s + 0.45);
    }
  },
  cricket(vol = 0.3) {
    if (!ctx) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 6; i++) {
      const s = t + i * 0.05, o = ctx.createOscillator(), v = ctx.createGain(); o.frequency.value = 4400;
      v.gain.setValueAtTime(0, s); v.gain.linearRampToValueAtTime(0.025 * vol, s + 0.01); v.gain.exponentialRampToValueAtTime(0.0001, s + 0.04);
      o.connect(v).connect(master); o.start(s); o.stop(s + 0.05);
    }
  }
};
