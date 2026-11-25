/* Nhạc niệm Phật trong chùa: /audio/temple.mp3 là một đoạn ~30 giây (~480 KB) cắt từ bản nhạc gốc dài ~1 giờ,
 * chỗ nối cuối-đầu đã được đan chéo nên phát lặp liền mạch. File nhỏ nên tải hết rồi giải mã vào AudioBuffer,
 * phát bằng AudioBufferSourceNode lặp đúng LOOP_SEC (không có khoảng lặng ở chỗ nối như thẻ <audio loop>).
 * Gần chánh điện nghe rõ; ra xa thì vừa nhỏ đi vừa bị lọc thông thấp, nghe như vọng từ xa.
 * Đi qua nút master của audio.js nên nút 🔊/🔇 tắt luôn cả nhạc. */
import { sfx } from './audio.js';

/* Đang TẮT để tiết kiệm băng thông host (không tải file nào). Muốn bật lại: chép media-src/temple-loop-30s.mp3
 * thành public/audio/temple.mp3 rồi đặt URL = '/audio/temple.mp3'. */
const URL = null;
const LOOP_SEC = 1320680 / 44100;   // độ dài đoạn lặp lúc cắt (mẫu / tần số lấy mẫu). Bộ mã hoá MP3 chèn thêm vài chục ms lặng ở đầu và cuối file
const MAX_GAIN = 0.7;      // âm lượng khi đứng trong chánh điện

let ctx = null, started = false, gain = null, lp = null, level = 0;

/* Vị trí mẫu đầu tiên có tiếng: bỏ qua khoảng lặng bộ mã hoá chèn vào (mỗi trình duyệt cắt bớt khác nhau). */
function leadIn(buf) {
  const d = buf.getChannelData(0), max = Math.min(d.length, buf.sampleRate);
  let i = 0;
  while (i < max && Math.abs(d[i]) < 1e-4) i++;
  return i < max ? i / buf.sampleRate : 0;
}

export const templeMusic = {
  /* Gọi sau sfx.init() (trong lúc xử lý cú nhấp chuột nên trình duyệt cho phép phát tiếng). */
  init() {
    ctx = sfx.context;
    if (!ctx || started || !URL) return;
    started = true;
    lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 450; lp.Q.value = 0.5;
    gain = ctx.createGain(); gain.gain.value = 0;
    lp.connect(gain).connect(sfx.out);
    fetch(URL)
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
      .then(ab => ctx.decodeAudioData(ab))
      .then(buf => {
        const src = ctx.createBufferSource();
        src.buffer = buf; src.loop = true;
        src.loopStart = leadIn(buf);
        src.loopEnd = Math.min(buf.duration, src.loopStart + LOOP_SEC);
        src.connect(lp);
        src.start(0, src.loopStart);
      })
      .catch(e => console.warn('Không tải được nhạc chùa:', e));
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
