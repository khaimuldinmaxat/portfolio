// Превью кейса: пиксельные волны. По документу «case-card-pixel-waves» и прототипу.
// В покое волны стоят на стартовом кадре; при наведении или фокусе плавно трогаются
// и расходятся из центра, при уходе за 0,35 с замирают там, где были.
(function () {
  const CELL = 16, W = 672, H = 420;
  const COLS = Math.ceil(W / CELL), ROWS = Math.ceil(H / CELL);
  const CX = W / 2, CY = H / 2;
  const MAXR = Math.hypot(CX, CY) + CELL * 2;
  // Медленнее прежнего в 1,4 раза (просьба Максата 26.11); ширина колец, шаг и кадр покоя те же
  const SPEED = 165;  // px/с (было 230)
  const THICK = 0.77; // через сколько секунд у круга появляется «дырка», с
  const EVERY = 1.6;  // новая волна каждые, с
  const START = 9.9;  // кадр, на котором карточка стоит в покое
  const EASE = 0.35;  // разгон и торможение, с
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const dist = new Float32Array(COLS * ROWS);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    dist[y * COLS + x] = Math.hypot(x * CELL + CELL / 2 - CX, y * CELL + CELL / 2 - CY);
  }

  document.querySelectorAll('.waves').forEach((box) => {
    const card = box.closest('.case-card') || box;
    const c = box.querySelector('.waves__fx');
    c.width = COLS; c.height = ROWS;
    const ctx = c.getContext('2d');
    const [base, wave] = box.dataset.colors.split(',');
    box.style.setProperty('--wave-base', base);
    let clock = START, speed = 0, target = 0, last = 0, raf = 0;

    function draw() {
      ctx.fillStyle = base; ctx.fillRect(0, 0, COLS, ROWS);
      ctx.fillStyle = wave;
      const rings = [];
      for (let k = Math.floor(clock / EVERY); k >= 0; k--) {
        const age = clock - k * EVERY;
        const inner = Math.max(0, SPEED * (age - THICK)), outer = SPEED * age;
        if (inner > MAXR) break;
        rings.push([inner, outer]);
      }
      for (let i = 0; i < dist.length; i++) {
        const d = dist[i];
        for (const [inner, outer] of rings) {
          if (d <= outer && d >= inner) { ctx.fillRect(i % COLS, (i / COLS) | 0, 1, 1); break; }
        }
      }
    }
    function tick(t) {
      const dt = last ? Math.min((t - last) / 1000, 0.05) : 0; last = t;
      const step = dt / EASE;
      speed = target > speed ? Math.min(target, speed + step) : Math.max(target, speed - step);
      clock += dt * speed;
      draw();
      if (speed > 0 || target > 0) raf = requestAnimationFrame(tick); else { raf = 0; last = 0; }
    }
    function play() { if (reduce) return; target = 1; if (!raf) raf = requestAnimationFrame(tick); }
    function pause() { target = 0; }

    card.addEventListener('pointerenter', play);
    card.addEventListener('pointerleave', pause);
    card.addEventListener('focus', play);
    card.addEventListener('blur', pause);
    draw();
  });
})();
