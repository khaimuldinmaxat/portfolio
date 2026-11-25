// Пиксельный мир на главной: шапка-пруд и пруд в футере.
// Поведение — по документу «pixel-world-concept» (проект «Сайт-резюме»):
// моргание, дыхание и охота лягушки, днём стрекозы, ночью светлячки, реплики по букве.
// Рябь, камыши и кувшинки анимирует CSS (site.css). Ночь = тёмная тема (data-theme="dark").
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
  const pond = document.querySelector('.pond__scene .stage');
  if (!scene) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; // статичный кадр

  const dir = scene.querySelector('.hero__head').getAttribute('src').replace(/[^/]+$/, '');
  const src = (name) => dir + name + '.png';
  const rnd = (a, b) => a + Math.random() * (b - a);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const isNight = () => document.documentElement.dataset.theme === 'dark';
  const snap = (v) => Math.round(v / 3) * 3; // двигаемся по сетке пикселя ×3

  const sprites = {};
  ['head-open', 'head-closed', 'frog-idle', 'frog-blink', 'frog-breath', 'frog-look-left',
    'frog-mouth-open', 'frog-gulp', 'dragonfly1', 'dragonfly2', 'firefly-on'].forEach((n) => {
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
  let frogBusy = false;
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

  // ---------- Летающие: днём стрекозы, ночью светлячки ----------
  // Зона полёта в шапке — овал над водой и головой (слой «Flight zone»: 331,0 · 530×170).
  const HEAD_ZONE = { oval: true, cx: 596, cy: 85, rx: 265, ry: 85 };
  const POND_ZONE = { oval: false, x0: 20, y0: 10, x1: 1160, y1: 150 };
  function pointIn(zone, w, h, k) {
    if (zone.oval) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * (k || 0.85);
      return { x: zone.cx + Math.cos(a) * r * zone.rx - w / 2, y: zone.cy + Math.sin(a) * r * zone.ry - h / 2 };
    }
    return { x: rnd(zone.x0, zone.x1 - w), y: rnd(zone.y0, zone.y1 - h) };
  }

  const creatures = [];
  function makeCreature(el, kind, zone, stage) {
    const x = parseFloat(el.style.left), y = parseFloat(el.style.top);
    el.style.left = '0px';
    el.style.top = '0px';
    const c = {
      el, img: el.querySelector('img'), kind, zone, stage,
      w: kind === 'dragonfly' ? 18 : 15, h: kind === 'dragonfly' ? 9 : 15,
      x, y, x0: x, y0: y, fx: x, fy: y, tx: x, ty: y, t0: 0, dur: 0,
      mode: 'hover', until: performance.now() + rnd(400, 1400),
      wing: 0, phase: Math.random() * 6,
    };
    el.addEventListener('click', () => catchCreature(c));
    creatures.push(c);
    return c;
  }
  scene.querySelectorAll('.fly').forEach((el) => makeCreature(el, 'dragonfly', HEAD_ZONE, scene));
  scene.querySelectorAll('.firefly').forEach((el) => makeCreature(el, 'firefly', HEAD_ZONE, scene));
  if (pond) pond.querySelectorAll('.firefly').forEach((el) => makeCreature(el, 'firefly', POND_ZONE, pond));

  const active = (c) => (c.kind === 'firefly') === isNight();

  function moveTo(c, p, now, dur) {
    c.fx = c.x; c.fy = c.y; c.tx = p.x; c.ty = p.y;
    c.t0 = now;
    c.dur = dur || (c.kind === 'dragonfly' ? rnd(350, 700) : rnd(1400, 2600));
    c.mode = 'dart';
    if (c.kind === 'dragonfly' && Math.abs(c.tx - c.fx) > 3) c.el.classList.toggle('is-right', c.tx > c.fx); // спрайт смотрит влево
  }
  function respawn(c) {
    setTimeout(() => {
      const z = c.zone;
      if (z.oval) {
        const fromLeft = Math.random() < 0.5;
        c.x = fromLeft ? z.cx - z.rx - 30 : z.cx + z.rx + 12;
        c.y = rnd(20, 120);
      } else {
        c.x = Math.random() < 0.5 ? -30 : 1200;
        c.y = rnd(z.y0, z.y1 - c.h);
      }
      c.el.classList.remove('is-gone');
      moveTo(c, pointIn(z, c.w, c.h, 0.7), performance.now(), c.kind === 'dragonfly' ? 900 : 2400);
      kick();
    }, rnd(3000, 6000));
  }
  // Клик по стрекозе или светлячку в шапке — его ловит лягушка (если занята, поймает следующим).
  // В пруду внизу лягушки нет — там существо просто исчезает.
  const queue = [];
  function catchCreature(c) {
    if (c.mode === 'gone' || c.mode === 'held') return;
    if (c.stage === scene) {
      c.mode = 'held';
      if (frogBusy) queue.push(c); else hunt(c, 'visitor');
      return;
    }
    c.mode = 'gone';
    c.el.classList.add('is-gone');
    respawn(c);
  }

  let wingTick = 0, raf = 0;
  const visible = new Map([[scene, true], [pond, true]]);
  function frame(now) {
    raf = 0;
    if (now - wingTick > 80) { // взмах крыльев стрекозы: 2 кадра по 80 мс
      wingTick = now;
      creatures.forEach((c) => {
        if (c.kind !== 'dragonfly' || !active(c)) return;
        c.wing ^= 1;
        c.img.src = src(c.wing ? 'dragonfly2' : 'dragonfly1');
      });
    }
    let any = false;
    creatures.forEach((c) => {
      if (!active(c) || !visible.get(c.stage)) return;
      any = true;
      let dx = c.x, dy = c.y;
      if (c.mode === 'dart') {
        const p = Math.min(1, (now - c.t0) / c.dur);
        const e = c.kind === 'dragonfly' ? 1 - Math.pow(1 - p, 3) : p * p * (3 - 2 * p);
        c.x = c.fx + (c.tx - c.fx) * e;
        c.y = c.fy + (c.ty - c.fy) * e;
        dx = c.x; dy = c.y;
        if (p === 1) { c.mode = 'hover'; c.until = now + (c.kind === 'dragonfly' ? rnd(500, 1600) : rnd(800, 2000)); }
      } else if (c.mode === 'hover') {
        if (c.kind === 'dragonfly') dy = c.y + (Math.sin(now / 160 + c.phase) > 0 ? 0 : 3); // зависает и подрагивает
        if (now > c.until) moveTo(c, pointIn(c.zone, c.w, c.h), now);
      }
      if (c.mode !== 'gone') c.el.style.transform = 'translate(' + snap(dx) + 'px,' + snap(dy) + 'px)';
    });
    if (any) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  if ('IntersectionObserver' in window) {
    [scene, pond].forEach((st) => {
      if (!st) return;
      new IntersectionObserver((entries) => { visible.set(st, entries[0].isIntersecting); kick(); }).observe(st.parentElement);
    });
  }
  kick();

  // ---------- Охота лягушки ----------
  // Сама ловит ближайшее существо, если оно ближе 75 px ко рту, не чаще раза в 10–20 с.
  // Look left 200 мс → Mouth open, язык до цели 120 мс → обратно с добычей 120 мс → Gulp 300 мс.
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
    if (prey.carried) {
      if (prey.kind === 'dragonfly') ctx.drawImage(sprites.dragonfly1, ex - 2, ey - 1, 6, 3);
      else ctx.drawImage(sprites['firefly-on'], ex - 2, ey - 2, 5, 5);
    }
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
  async function hunt(c, who) {
    frogBusy = true;
    c.mode = 'held';
    const cx = snap(c.x) + c.w / 2, cy = snap(c.y) + c.h / 2;
    const toLeft = cx < MOUTH.x;
    const prey = { tux: cx / 3, tuy: cy / 3, carried: false, kind: c.kind };
    setFrog('look-left', !toLeft);
    await wait(200);
    setFrog('mouth-open', !toLeft);
    await tween(120, (p) => 1 - Math.pow(1 - p, 3), (t) => drawTongue(t, prey));
    c.mode = 'gone';
    c.el.classList.add('is-gone');
    prey.carried = true;
    await tween(120, (p) => p * p * p, (t) => drawTongue(1 - t, prey));
    drawTongue(0, prey);
    setFrog('gulp');
    await wait(300);
    setFrog('idle');
    respawn(c);
    // «...ещё один!» — когда помог посетитель, «...наелась, ква?» — когда поймала сама
    sayNow(who === 'visitor' ? 'more' : 'frog');
    const next = queue.shift();
    if (next) { await wait(250); hunt(next, 'visitor'); return; }
    frogBusy = false;
    nextHunt = performance.now() + rnd(10000, 20000);
  }
  setInterval(() => {
    const now = performance.now();
    if (frogBusy || now < nextHunt || !visible.get(scene) || document.hidden) return;
    const target = creatures.find((c) => c.stage === scene && active(c) && (c.mode === 'hover' || c.mode === 'dart') &&
      Math.hypot(c.x + c.w / 2 - MOUTH.x, c.y + c.h / 2 - MOUTH.y) <= 75);
    if (target) hunt(target, 'frog');
  }, 300);

  // ---------- Реплики ----------
  // Печатаются по букве (40 мс на символ), мигающий курсор, висят 3–4 с, исчезают за 150 мс.
  // Сначала приветствие, дальше раз в 15–20 с случайная реплика по времени суток.
  const speech = scene.querySelector('.speech');
  const clip = speech.querySelector('.speech__clip');
  const cursor = speech.querySelector('.speech__cursor');
  // Каждая реплика — текст шрифтом GNF в кривых. data-edges — правый край каждого символа
  // (до него открываем текст), data-adv — где кончается символ (за ним через 3 px курсор).
  // data-when: day / night — по времени суток, catch — только сразу после поимки.
  const PHRASES = {};
  clip.querySelectorAll('svg[data-phrase]').forEach((svg) => {
    PHRASES[svg.dataset.phrase] = {
      svg, when: svg.dataset.when || '',
      edges: svg.dataset.edges.split(',').map(Number),
      adv: svg.dataset.adv.split(',').map(Number),
    };
  });
  let speaking = false, loopTimer = 0;

  // Реплика остаётся на месте с мигающим курсором, пока её не сменит следующая
  let current = null;
  function say(key, done) {
    const ph = PHRASES[key];
    if (!ph) { if (done) done(); return; }
    speaking = true;
    const start = () => {
      current = key;
      Object.values(PHRASES).forEach((p) => p.svg.toggleAttribute('hidden', p !== ph));
      speech.style.left = ph.svg.dataset.left + 'px';
      clip.style.width = '0px';
      speech.classList.remove('is-hidden', 'is-idle');
      let i = 0;
      (function step() {
        clip.style.width = (i ? ph.edges[i - 1] : 0) + 'px';
        cursor.style.left = (i ? ph.adv[i - 1] : 0) + 3 + 'px';
        if (i < ph.edges.length) { i++; setTimeout(step, 40); return; }
        speech.classList.add('is-idle');
        speaking = false;
        if (done) done();
      })();
    };
    if (current) { speech.classList.add('is-hidden'); setTimeout(start, 150); } else start();
  }
  function pool() {
    return Object.keys(PHRASES).filter((k) => {
      const w = PHRASES[k].when;
      return k !== 'greet' && w !== 'catch' && (!w || (w === 'night') === isNight());
    });
  }
  function schedule() {
    clearTimeout(loopTimer);
    loopTimer = setTimeout(() => {
      const list = pool().filter((k) => k !== current);
      if (!list.length || speaking) return schedule();
      say(list[Math.floor(Math.random() * list.length)], schedule);
    }, rnd(15000, 20000));
  }
  // Сразу после поимки: «...ещё один!» — ловит посетитель, «...наелась, ква?» — ловит лягушка
  function sayNow(key) { if (PHRASES[key] && !speaking) say(key, schedule); }

  speech.classList.add('is-hidden');
  setTimeout(() => say('greet', schedule), 700);
  // Смена дня и ночи: если висит реплика другого времени суток — сразу заменить подходящей
  document.addEventListener('themechange', () => {
    const w = current && PHRASES[current].when;
    if ((w === 'day' || w === 'night') && (w === 'night') !== isNight() && !speaking) {
      const list = pool();
      if (list.length) say(list[Math.floor(Math.random() * list.length)], schedule);
    }
  });

  // ---------- Смена дня и ночи из меню ----------
  document.addEventListener('themechange', () => {
    creatures.forEach((c) => {
      if (c.mode === 'held') return;
      c.mode = 'hover';
      c.until = performance.now() + rnd(300, 1200);
      c.el.classList.remove('is-gone');
    });
    kick();
  });
})();
