// Пиксельный мир на главной: шапка-пруд и пруд в футере.
// Поведение — по документу «pixel-world-concept» (проект «Сайт-резюме»):
// моргание, дыхание и охота лягушки, стрекозы в зоне полёта, реплика по букве.
// Рябь, камыши и кувшинки анимирует CSS (site.css).
(function () {
  const stages = Array.from(document.querySelectorAll('.stage'));
  if (!stages.length) return;

  // ---------- Масштаб: сцена нарисована в координатах макета, подгоняем под блок ----------
  function fit() {
    stages.forEach((st) => {
      const box = st.parentElement;
      const W = +st.dataset.w, H = +st.dataset.h;
      const s = box.clientHeight / H;
      st.style.setProperty('--s', s);
      st.style.setProperty('--x', (box.clientWidth - W * s) / 2 + 'px');
    });
  }
  fit();
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(fit);
    stages.forEach((st) => ro.observe(st.parentElement));
  } else {
    window.addEventListener('resize', fit);
  }

  const scene = document.querySelector('.scene .stage');
  if (!scene) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; // статичный кадр

  const dir = scene.querySelector('.hero__head').getAttribute('src').replace(/[^/]+$/, '');
  const src = (name) => dir + name + '.png';
  const rnd = (a, b) => a + Math.random() * (b - a);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const sprites = {};
  ['head-open', 'head-closed', 'frog-idle', 'frog-blink', 'frog-breath', 'frog-look-left',
    'frog-mouth-open', 'frog-gulp', 'dragonfly1', 'dragonfly2'].forEach((n) => {
    const im = new Image();
    im.src = src(n);
    sprites[n] = im;
  });

  // ---------- Голова: моргание 120 мс раз в 3–6 с ----------
  const head = scene.querySelector('.hero__head');
  (function blink() {
    setTimeout(() => {
      head.src = src('head-closed');
      setTimeout(() => { head.src = src('head-open'); blink(); }, 120);
    }, rnd(3000, 6000));
  })();

  // ---------- Лягушка: дыхание ~600 мс, моргание 150 мс раз в 6–10 с ----------
  const frog = scene.querySelector('.hero__frog');
  let frogBusy = false;   // охотится
  let frogFrame = 'idle';
  function setFrog(name, mirror) {
    frogFrame = name;
    frog.src = src('frog-' + name);
    frog.classList.toggle('is-mirrored', !!mirror);
  }
  (function breathe() {
    setTimeout(() => {
      if (!frogBusy && frogFrame === 'idle') {
        setFrog('breath');
        setTimeout(() => { if (!frogBusy && frogFrame === 'breath') setFrog('idle'); breathe(); }, 600);
      } else breathe();
    }, 1800);
  })();
  (function frogBlink() {
    setTimeout(() => {
      if (!frogBusy && frogFrame === 'idle') {
        setFrog('blink');
        setTimeout(() => { if (!frogBusy && frogFrame === 'blink') setFrog('idle'); frogBlink(); }, 150);
      } else frogBlink();
    }, rnd(6000, 10000));
  })();

  // ---------- Стрекозы ----------
  // Зона полёта — овал над водой и головой (слой «Flight zone» в макете: 331,0 · 530×170).
  const ZONE = { cx: 596, cy: 85, rx: 265, ry: 85 };
  const FW = 18, FH = 9;
  function pointInZone(k) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * (k || 0.85);
    return { x: ZONE.cx + Math.cos(a) * r * ZONE.rx - FW / 2, y: ZONE.cy + Math.sin(a) * r * ZONE.ry - FH / 2 };
  }
  const snap = (v) => Math.round(v / 3) * 3; // двигаемся по сетке пикселя ×3

  const flies = Array.from(scene.querySelectorAll('.fly')).map((el, i) => {
    const x = parseFloat(el.style.left), y = parseFloat(el.style.top);
    el.style.left = '0px';
    el.style.top = '0px';
    const f = { el, img: el.querySelector('img'), x, y, fx: x, fy: y, tx: x, ty: y, t0: 0, dur: 0,
      mode: 'hover', until: performance.now() + rnd(400, 1400), wing: i, phase: Math.random() * 6 };
    el.addEventListener('click', () => catchFly(f));
    return f;
  });

  function dartTo(f, p, now, dur) {
    f.fx = f.x; f.fy = f.y; f.tx = p.x; f.ty = p.y;
    f.t0 = now; f.dur = dur || rnd(350, 700);
    f.mode = 'dart';
    if (Math.abs(f.tx - f.fx) > 3) f.el.classList.toggle('is-right', f.tx > f.fx); // спрайт смотрит влево
  }
  function respawn(f) {
    setTimeout(() => {
      const fromLeft = Math.random() < 0.5;
      f.x = fromLeft ? ZONE.cx - ZONE.rx - 30 : ZONE.cx + ZONE.rx + 12;
      f.y = rnd(20, 120);
      f.el.classList.remove('is-gone');
      dartTo(f, pointInZone(0.7), performance.now(), 900);
      kick();
    }, rnd(3000, 6000));
  }
  function catchFly(f) {
    if (f.mode === 'gone' || f.mode === 'held') return;
    f.mode = 'gone';
    f.el.classList.add('is-gone');
    respawn(f);
  }

  let wingTick = 0, raf = 0, visible = true;
  function frame(now) {
    raf = 0;
    if (now - wingTick > 80) { // взмах крыльев: 2 кадра по 80 мс
      wingTick = now;
      flies.forEach((f) => { f.wing ^= 1; f.img.src = src(f.wing ? 'dragonfly2' : 'dragonfly1'); });
    }
    flies.forEach((f) => {
      let dx = f.x, dy = f.y;
      if (f.mode === 'dart') {
        const p = Math.min(1, (now - f.t0) / f.dur);
        const e = 1 - Math.pow(1 - p, 3);
        f.x = f.fx + (f.tx - f.fx) * e;
        f.y = f.fy + (f.ty - f.fy) * e;
        dx = f.x; dy = f.y;
        if (p === 1) { f.mode = 'hover'; f.until = now + rnd(500, 1600); }
      } else if (f.mode === 'hover') {
        dy = f.y + (Math.sin(now / 160 + f.phase) > 0 ? 0 : 3); // зависает и чуть подрагивает
        if (now > f.until) dartTo(f, pointInZone(), now);
      }
      if (f.mode !== 'gone') f.el.style.transform = 'translate(' + snap(dx) + 'px,' + snap(dy) + 'px)';
    });
    if (visible) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && visible) raf = requestAnimationFrame(frame); }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      kick();
    }).observe(scene.parentElement);
  }
  kick();

  // ---------- Охота лягушки ----------
  // Сама ловит стрекозу, если та ближе 75 px ко рту, не чаще раза в 10–20 с.
  // Look left 200 мс → Mouth open, язык до цели 120 мс → обратно со стрекозой 120 мс → Gulp 300 мс.
  const canvas = scene.querySelector('.tongue');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const MOUTH = { x: 576 + 9 * 3 + 1.5, y: 132 + 8 * 3 + 1.5 }; // центр рта в кадре Mouth open
  const M = { x: 201, y: 52 };                                   // то же в пикселях спрайта
  let nextHunt = performance.now() + rnd(6000, 12000);

  function drawTongue(len, prey) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (len <= 0) return;
    const ex = Math.round(M.x + (prey.tux - M.x) * len), ey = Math.round(M.y + (prey.tuy - M.y) * len);
    const pts = [];
    let x0 = M.x, y0 = M.y;
    const dx = Math.abs(ex - x0), dy = -Math.abs(ey - y0), sx = x0 < ex ? 1 : -1, sy = y0 < ey ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      pts.push([x0, y0]);
      if (x0 === ex && y0 === ey) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    ctx.fillStyle = '#26192c';
    pts.forEach(([x, y]) => ctx.fillRect(x - 1, y - 1, 3, 3));
    ctx.fillRect(ex - 1, ey - 1, 4, 4);
    ctx.fillStyle = '#f69ca0';
    pts.forEach(([x, y]) => ctx.fillRect(x, y, 1, 1));
    ctx.fillRect(ex, ey, 2, 2); // кончик 2×2
    if (prey.carried) ctx.drawImage(sprites.dragonfly1, ex - 2, ey - 1, 6, 3);
  }
  function tween(ms, ease, fn) {
    return new Promise((res) => {
      const t0 = performance.now();
      (function step(now) {
        const p = Math.min(1, (now - t0) / ms);
        fn(ease(p));
        if (p < 1) requestAnimationFrame(step); else res();
      })(t0);
    });
  }
  async function hunt(f) {
    frogBusy = true;
    f.mode = 'held';
    const cx = snap(f.x) + FW / 2, cy = snap(f.y) + FH / 2;
    const toLeft = cx < MOUTH.x;
    const prey = { tux: cx / 3, tuy: cy / 3, carried: false };
    setFrog('look-left', !toLeft);
    await wait(200);
    setFrog('mouth-open', !toLeft);
    await tween(120, (p) => 1 - Math.pow(1 - p, 3), (t) => drawTongue(t, prey));
    f.mode = 'gone';
    f.el.classList.add('is-gone');
    prey.carried = true;
    await tween(120, (p) => p * p * p, (t) => drawTongue(1 - t, prey));
    drawTongue(0, prey);
    setFrog('gulp');
    await wait(300);
    setFrog('idle');
    frogBusy = false;
    nextHunt = performance.now() + rnd(10000, 20000);
    respawn(f);
  }
  setInterval(() => {
    const now = performance.now();
    if (frogBusy || now < nextHunt || !visible || document.hidden) return;
    const target = flies.find((f) => (f.mode === 'hover' || f.mode === 'dart') &&
      Math.hypot(f.x + FW / 2 - MOUTH.x, f.y + FH / 2 - MOUTH.y) <= 75);
    if (target) hunt(target);
  }, 300);

  // ---------- Реплика ----------
  // Печатается по букве (40 мс на символ), мигающий курсор, висит 3–4 с, исчезает за 150 мс.
  // Пока есть только приветствие: остальные реплики появятся, когда на сайте будет шрифт GNF.
  const speech = scene.querySelector('.speech');
  const clip = speech.querySelector('.speech__clip');
  const cursor = speech.querySelector('.speech__cursor');
  const X0 = 0.73, GAP = 4.35;
  // Правый край каждого символа «...привет, я максат!» (пробелы повторяют предыдущий)
  const GREET = [1.46, 4.24, 7.02, 15.66, 24.3, 32.94, 41.58, 50.22, 58.86, 61.64, 61.64,
    74.52, 74.52, 87.41, 96.04, 103.22, 111.86, 120.5, 129.14, 131.92];
  function show(w, i) {
    clip.style.width = w + 'px';
    cursor.style.left = X0 + w + (i ? GAP : 0) + 'px';
  }
  function say(widths, done) {
    speech.classList.remove('is-hidden', 'is-idle');
    let i = 0;
    (function step() {
      show(i ? widths[i - 1] : 0, i);
      if (i < widths.length) { i++; setTimeout(step, 40); return; }
      speech.classList.add('is-idle');
      setTimeout(() => {
        speech.classList.add('is-hidden');
        setTimeout(done || (() => {}), 150);
      }, rnd(3000, 4000));
    })();
  }
  speech.classList.add('is-hidden');
  show(0, 0);
  setTimeout(() => say(GREET), 700);
})();
