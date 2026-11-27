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

  let anchor = null; // кувшинка, над которой открыта форма
  let noteLily = null; // цветок, чьё письмо сейчас открыто
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
    document.querySelectorAll('.js-paper').forEach((el) => { if (!anchorOpen(el)) el.innerHTML = svg; });
    cursor.innerHTML = svg;
  }
  paintPapers();
  if (!reduce) setInterval(() => { ci = (ci + 1) % COLORS.length; paintPapers(); }, 1600);

  // Над кувшинкой с открытым письмом бумажка цвета письма, а не перебирает цвета
  function anchorOpen(el) { return anchor && !form.hidden && anchor.contains(el); }

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
    b.style.setProperty('--d', (-Math.random() * 2).toFixed(2) + 's'); // своя фаза покачивания и ряби
    b.setAttribute('aria-label', 'Открыть сообщение' + (msg.name ? ' от ' + msg.name : ''));
    b.innerHTML = '<span class="lily__ripple rip rip--loop">' + [1, 2, 3].map((i) => '<img src="' + DIR + 'lily-ripple-' + i + '.png?v=2" alt="">').join('') + '</span><img class="lily__body" alt="" width="93" height="51">';
    b.querySelector('.lily__body').src = lilySrc(type, 'open', msg.color);
    // Повторный клик по тому же цветку закрывает письмо
    b.addEventListener('click', (e) => { e.stopPropagation(); if (!card.hidden && noteLily === b) closeAll(); else openNote(b, msg, own); });
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
    noteLily = null;
    if (anchor) { anchor.classList.remove('is-awake'); anchor = null; }
  }
  const DATE = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
  function openNote(lily, msg, own) {
    closeAll();
    noteLily = lily;
    const [L, M, S] = PAPER[msg.color];
    card.style.setProperty('--paper', L);
    card.style.setProperty('--paper-line', M);
    card.style.setProperty('--paper-ink', S);
    card.textContent = '';
    const sheet = document.createElement('div');
    sheet.className = 'letter__sheet';
    const text = document.createElement('p');
    text.className = 'letter__text';
    text.textContent = msg.text;
    const meta = document.createElement('p');
    meta.className = 'letter__meta';
    const left = document.createElement('span');
    // Своё письмо выглядит как обычное: с датой отправки. Пока я его не проверю, оно лежит только
    // в браузере посетителя (localStorage) — другим его не видно, но говорить об этом не нужно
    const when = own ? (msg.sent ? new Date(msg.sent) : null) : (msg.date ? new Date(msg.date + 'T12:00:00') : null);
    if (when) left.textContent = DATE.format(when);
    meta.append(left);
    if (msg.name) {
      const sign = document.createElement('b');
      sign.textContent = '— ' + msg.name;
      meta.append(sign);
    }
    sheet.append(text, meta);
    card.append(sheet);
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
    b.innerHTML = '<svg viewBox="0 0 8 9" aria-hidden="true">' + paperSVG(c) + '</svg>';
    b.addEventListener('click', () => setColor(c));
    sw.appendChild(b);
  });
  sw.setAttribute('role', 'radiogroup');
  sw.setAttribute('aria-label', 'Цвет бумаги');
  function setColor(c) {
    color = c;
    form.style.setProperty('--paper', PAPER[c][0]);
    form.style.setProperty('--paper-line', PAPER[c][1]);
    form.style.setProperty('--paper-ink', PAPER[c][2]);
    sw.querySelectorAll('.swatch').forEach((b, i) => b.setAttribute('aria-checked', String(COLORS[i] === c)));
    const held = anchor && anchor.querySelector('.js-paper');
    if (held) held.innerHTML = paperSVG(c);
  }
  // Подпись прижата вправо и растёт по ширине текста; лист растёт по строкам до шести
  const nameInput = form.elements.name;
  const ruler = document.createElement('span');
  ruler.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font:15px/24px GNF,Inter,sans-serif';
  form.appendChild(ruler);
  function fitName() {
    ruler.textContent = nameInput.value || nameInput.placeholder;
    nameInput.style.width = Math.ceil(ruler.offsetWidth) + 2 + 'px';
  }
  nameInput.addEventListener('input', fitName);
  function fitText() {
    ta.style.height = '96px';
    ta.style.height = Math.min(144, Math.max(96, Math.ceil(ta.scrollHeight / 24) * 24)) + 'px';
  }
  ta.addEventListener('input', fitText);

  function openForm(pad) {
    closeAll();
    anchor = pad;
    pad.classList.add('is-awake');
    setColor(COLORS[ci]); // бумага того цвета, что была в руке
    err.hidden = true;
    place(form, pad);
    fitName();
    fitText();
    ta.focus({ preventScroll: true });
  }
  frees.forEach((pad) => {
    const wake = (on) => { if (anchor !== pad) pad.classList.toggle('is-awake', on); };
    pad.addEventListener('pointerenter', (e) => { wake(true); if (e.pointerType === 'mouse') cursor.style.display = 'block'; });
    pad.addEventListener('pointerleave', () => { wake(false); cursor.style.display = 'none'; });
    pad.addEventListener('pointermove', (e) => { cursor.style.transform = 'translate(' + (e.clientX - 4) + 'px,' + (e.clientY - 16) + 'px)'; });
    pad.addEventListener('focus', () => wake(true));
    pad.addEventListener('blur', () => wake(false));
    // Повторный клик по той же кувшинке закрывает форму (написанное не стирается)
    pad.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!form.hidden && anchor === pad) { closeAll(); return; }
      cursor.style.display = 'none'; openForm(pad);
    });
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
    fitName();
    fitText();
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
    const img = flower.querySelector('.lily__body');
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
