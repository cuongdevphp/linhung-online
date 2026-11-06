/* Nhạc niệm Phật trong chùa: file /audio/temple.mp3 (dài ~67 phút) phát lặp, đưa vào đồ thị WebAudio.
 * Dùng thẻ <audio> để tải dần từng đoạn (không giải mã cả file vào RAM), rồi nối qua
 * createMediaElementSource để vẫn chỉnh được âm lượng và bộ lọc thông thấp.
 * Gần chánh điện nghe rõ; ra xa thì vừa nhỏ đi vừa bị lọc, nghe như vọng từ xa.
 * Đi qua nút master của audio.js nên nút 🔊/🔇 tắt luôn cả nhạc. */
import { sfx } from './audio.js';

const URL = '/audio/temple.mp3';
const MAX_GAIN = 0.7;      // âm lượng khi đứng trong chánh điện

let ctx = null, started = false, audio = null, gain = null, lp = null, level = 0;

export const templeMusic = {
  /* Gọi sau sfx.init() (trong lúc xử lý cú nhấp chuột nên trình duyệt cho phép phát tiếng). */
  init() {
    ctx = sfx.context;
    if (!ctx || started) return;
    started = true;
    audio = new Audio(URL);
    audio.loop = true; audio.preload = 'auto';
    const src = ctx.createMediaElementSource(audio);
    lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 450; lp.Q.value = 0.5;
    gain = ctx.createGain(); gain.gain.value = 0;
    src.connect(lp).connect(gain).connect(sfx.out);
    audio.play().catch(e => console.warn('Không phát được nhạc chùa:', e));
    audio.addEventListener('error', () => console.warn('Không tải được nhạc chùa', audio.error));
  },
  /* target 0..1: 1 là trong chánh điện. dt (giây) để đổi mượt, không giật khi bước qua cửa điện. */
  setLevel(target, dt) {
    level += (target - level) * (1 - Math.exp(-dt / 0.7));
    if (!gain) return;
    const t = ctx.currentTime;
    gain.gain.setTargetAtTime(level * MAX_GAIN, t, 0.1);
    lp.frequency.setTargetAtTime(450 + 14000 * level * level, t, 0.1);
  }
};
