// Пруд с сообщениями в футере главной. По документу «pixel-world-concept», раздел «Футер — кувшинки из сообщений».
// Посетитель нажимает на кувшинку без цветка, пишет сообщение и выбирает цвет бумаги.
// Сообщение уходит в Formspree (письмо Максату), а на этой кувшинке у посетителя сразу распускается цветок —
// видно только ему, пока Максат не проверит. Одобренные сообщения лежат в data/messages.json и видны всем.
(function () {
  const pond = document.querySelector('.pond');
  if (!pond) return;
  const stage = pond.querySelector('.stage');
  const form = document.getElementById('pond-form');
  const card = document.getElementById('pond-note');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ENDPOINT = 'https://formspree.io/f/xnpdwgqy';
  const MINE_KEY = 'pond-mine';
  const DIR = stage.querySelector('.lily__body').getAttribute('src').replace(/[^/]+$/, '');
  const DATA = DIR.replace('assets/img/px/', 'data/messages.json');

  // Цвета бумаги: светлый / основной / тень. Бумага — светлый тон.
  const PAPER = {
    white: ['#f4f1ea', '#d9d2c3', '#b0a690'], pink: ['#f6b8c8', '#e98aa6', '#c25d80'],
    yellow: ['#f7e08a', '#e6c35a', '#b8923a'], blue: ['#b8dcf4', '#82b6e0', '#5a8cbc'],
    lilac: ['#d4c2f0', '#ad94dc', '#8467b8'], mint: ['#bfe8cf', '#8fcfa9', '#5fa37f'],
  };
  const COLORS = Object.keys(PAPER);
  const NAMES = { white: 'белая', pink: 'розовая', yellow: 'жёлтая', blue: 'голубая', lilac: 'сиреневая', mint: 'мятная' };

  // Места для одобренных сообщений — где в макете стоят кувшинки с цветами. Самое новое — первое место.
  const SLOTS = [[580, 18, 'solid'], [320, 30, 'notched'], [710, 120, 'notched'], [60, 22, 'solid'],
    [970, 112, 'solid'], [1080, 20, 'solid'], [190, 118, 'notched']];

  // ---------- Бумажка Pixel/Paper 8×9 ----------
  const GRID = ['.OOOOO..', 'OLLLLMO.', 'OLLLLMMO', 'OLSSLOOO', 'OLLLLLLO', 'OLSSSSLO', 'OLLLLLLO', 'OLLLLLLO', '.OOOOOO.'];
  function paperSVG(color) {
    const [L, M, S] = PAPER[color];
    const map = { O: '#26192c', L, M, S };
    let r = '';
    GRID.forEach((row, y) => [...row].forEach((c, x) => {
      if (map[c]) r += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + map[c] + '"/>';
    }));
    return r;
  }
  const cursor = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  cursor.setAttribute('viewBox', '0 0 8 9');
  cursor.setAttribute('class', 'pond-cursor');
  cursor.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cursor);

  // Бумажки у призыва, над листом и курсор меняют цвет вместе, раз в 1,6 с
  let ci = 0;
  function paintPapers() {
    const svg = paperSVG(COLORS[ci]);
    document.querySelectorAll('.js-paper').forEach((el) => { el.innerHTML = svg; });
    cursor.innerHTML = svg;
  }
  paintPapers();
  if (!reduce) setInterval(() => { ci = (ci + 1) % COLORS.length; paintPapers(); }, 1600);

  // ---------- Свои сообщения (до проверки) ----------
  function loadMine() {
    try { return JSON.parse(localStorage.getItem(MINE_KEY)) || []; } catch (e) { return []; }
  }
  function saveMine(list) { try { localStorage.setItem(MINE_KEY, JSON.stringify(list)); } catch (e) {} }

  // ---------- Кувшинки ----------
  const lilySrc = (type, state, color) => DIR + 'lily-' + type + '-' + state + '-' + color + '.png';
  function makeFlower(x, y, type, msg, own) {
    const glow = document.createElement('span');
    glow.className = 'pond-glow night-only';
    glow.style.cssText = 'left:' + (x + 28) + 'px;top:' + (y + 3) + 'px;background:' + PAPER[msg.color][0];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'spr lily lily--note';
    b.style.left = x + 'px';
    b.style.top = y + 'px';
    b.setAttribute('aria-label', 'Открыть сообщение' + (msg.name ? ' от ' + msg.name : ''));
    b.innerHTML = '<span class="lily__ripple rip">' + [1, 2, 3].map((i) => '<img src="' + DIR + 'lily-ripple-' + i + '.png" alt="">').join('') + '</span><img class="lily__body" alt="" width="93" height="51">';
    b.querySelector('img').src = lilySrc(type, 'open', msg.color);
    b.addEventListener('click', (e) => { e.stopPropagation(); openNote(b, msg, own); });
    stage.insertBefore(glow, stage.querySelector('.firefly'));
    stage.insertBefore(b, stage.querySelector('.firefly'));
    return b;
  }

  const frees = Array.from(stage.querySelectorAll('.lily--free'));
  const mine = loadMine();
  function render(approved) {
    approved.slice(0, SLOTS.length).forEach((m, i) => {
      if (!PAPER[m.color]) return;
      const [x, y, type] = SLOTS[i];
      makeFlower(x, y, type, m, false);
    });
    // Своё сообщение, уже одобренное, показывать дважды не нужно
    const shown = new Set(approved.map((m) => m.text));
    const left = mine.filter((m) => !shown.has(m.text));
    if (left.length !== mine.length) saveMine(left);
    left.forEach((m) => {
      const pad = frees[m.slot];
      if (!pad || pad.hidden) return;
      pad.hidden = true;
      makeFlower(parseFloat(pad.style.left), parseFloat(pad.style.top), 'notched', m, true);
    });
  }
  fetch(DATA + '?t=' + Date.now(), { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => [])
    .then((list) => render(Array.isArray(list) ? list : []));

  // ---------- Поповеры ----------
  let anchor = null;
  function place(el, target) {
    el.hidden = false;
    const box = pond.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    const w = el.offsetWidth, h = el.offsetHeight;
    let left = r.left + r.width / 2 - box.left - w / 2;
    const min = 16 - box.left, max = window.innerWidth - 16 - box.left - w;
    left = Math.max(min, Math.min(max, left));
    el.style.left = left + 'px';
    el.style.top = r.top - box.top - h - 8 + 'px';
    el.style.transformOrigin = (r.left + r.width / 2 - box.left - left) + 'px 100%';
    el.classList.remove('is-open');
    void el.offsetWidth;
    el.classList.add('is-open');
  }
  function closeAll() {
    form.hidden = true;
    card.hidden = true;
    if (anchor) { anchor.classList.remove('is-awake'); anchor = null; }
  }
  const DATE = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
  function openNote(lily, msg, own) {
    closeAll();
    card.style.background = PAPER[msg.color][0];
    card.textContent = '';
    const text = document.createElement('p');
    text.textContent = msg.text;
    const meta = document.createElement('p');
    meta.className = 'note__meta';
    if (own) meta.textContent = 'Видно только вам, пока я его не проверю';
    else {
      const d = msg.date ? DATE.format(new Date(msg.date + 'T12:00:00')) : '';
      meta.textContent = [msg.name, d].filter(Boolean).join(' · ');
    }
    card.append(text, meta);
    place(card, lily);
    if (!reduce) {
      lily.classList.remove('lily--planting');
      void lily.offsetWidth;
    }
  }
  document.addEventListener('click', (e) => {
    if (form.hidden && card.hidden) return;
    if (form.contains(e.target) || card.contains(e.target)) return;
    closeAll();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || (form.hidden && card.hidden)) return;
    const back = anchor;
    closeAll();
    if (back) back.focus();
  });

  // ---------- Форма ----------
  const ta = form.querySelector('textarea');
  const count = form.querySelector('.note__count');
  const err = form.querySelector('.note__error');
  const submit = form.querySelector('[type="submit"]');
  const sw = form.querySelector('.note__swatches');
  let color = 'white';
  COLORS.forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-label', NAMES[c]);
    b.style.setProperty('--fill', PAPER[c][0]);
    b.style.setProperty('--shade', PAPER[c][1]);
    b.addEventListener('click', () => setColor(c));
    sw.appendChild(b);
  });
  sw.setAttribute('role', 'radiogroup');
  sw.setAttribute('aria-label', 'Цвет бумаги');
  function setColor(c) {
    color = c;
    form.style.setProperty('--paper', PAPER[c][0]);
    sw.querySelectorAll('.swatch').forEach((b, i) => b.setAttribute('aria-checked', String(COLORS[i] === c)));
  }
  ta.addEventListener('input', () => { count.textContent = ta.value.length + ' / 140'; });

  function openForm(pad) {
    closeAll();
    anchor = pad;
    pad.classList.add('is-awake');
    setColor(COLORS[ci]); // бумага того цвета, что была в руке
    err.hidden = true;
    place(form, pad);
    ta.focus({ preventScroll: true });
  }
  frees.forEach((pad) => {
    const wake = (on) => { if (anchor !== pad) pad.classList.toggle('is-awake', on); };
    pad.addEventListener('pointerenter', (e) => { wake(true); if (e.pointerType === 'mouse') cursor.style.display = 'block'; });
    pad.addEventListener('pointerleave', () => { wake(false); cursor.style.display = 'none'; });
    pad.addEventListener('pointermove', (e) => { cursor.style.transform = 'translate(' + (e.clientX - 4) + 'px,' + (e.clientY - 16) + 'px)'; });
    pad.addEventListener('focus', () => wake(true));
    pad.addEventListener('blur', () => wake(false));
    pad.addEventListener('click', (e) => { e.stopPropagation(); cursor.style.display = 'none'; openForm(pad); });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = ta.value.trim();
    if (!text) { err.textContent = 'Напишите пару слов'; err.hidden = false; ta.focus(); return; }
    const last = mine.length ? mine[mine.length - 1].sent : 0;
    if (Date.now() - last < 60000) { err.textContent = 'Можно одно сообщение в минуту'; err.hidden = false; return; }
    const data = {
      message: text,
      name: form.elements.name.value.trim(),
      color,
      _gotcha: form.elements._gotcha.value,
      _subject: 'Новое сообщение в пруду',
    };
    submit.disabled = true;
    err.hidden = true;
    let ok = false;
    try {
      const r = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });
      ok = r.ok;
    } catch (e2) { ok = false; }
    submit.disabled = false;
    if (!ok) { err.textContent = 'Не получилось отправить. Попробуйте ещё раз'; err.hidden = false; return; }

    const pad = anchor;
    const msg = { text, name: data.name, color, slot: +pad.dataset.free, sent: Date.now() };
    mine.push(msg);
    saveMine(mine);
    if (!reduce) {
      await form.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0)', opacity: 0.4 }],
        { duration: 220, easing: 'ease-in' }).finished;
    }
    form.reset();
    count.textContent = '0 / 140';
    closeAll();
    plant(pad, msg);
  });

  // ---------- Посадка ----------
  // Сообщение уменьшается в точку → падает на кувшинку, круг ряби → цветок Bud → Half → Open по 160 мс.
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function plant(pad, msg) {
    const x = parseFloat(pad.style.left), y = parseFloat(pad.style.top);
    pad.hidden = true;
    const flower = makeFlower(x, y, 'notched', msg, true);
    const img = flower.querySelector('img');
    if (reduce) return;
    img.src = DIR + 'pad.png';
    const drop = document.createElement('span');
    drop.className = 'pond-drop';
    drop.style.cssText = 'left:' + (x + 43) + 'px;top:' + (y - 60) + 'px;background:' + PAPER[msg.color][0] + ';box-shadow:0 0 0 3px #26192c';
    stage.appendChild(drop);
    await drop.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(80px)' }], { duration: 260, easing: 'cubic-bezier(.55,0,1,.45)' }).finished;
    drop.remove();
    flower.classList.add('lily--planting');
    for (const st of ['bud', 'half', 'open']) {
      img.src = lilySrc('notched', st, msg.color);
      await wait(160);
    }
    flower.classList.remove('lily--planting');
  }
})();
