// Боковое меню: раскрывающиеся списки, текущий раздел с оранжевым квадратом. Почта копируется по клику.
(function () {
  const sidebar = document.querySelector('.sidebar');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Стрелка раскрывает и сворачивает список. «Кейсы» — ссылка на блок кейсов, список только по стрелке.
  // Как у Мартина: стрелка схлопывается в точку и вырастает в другую сторону (точка → 3 пикселя → 5),
  // список при открытии вырастает по высоте и проявляется, при закрытии гаснет и схлопывается.
  const PX = (pts) => pts.map(([x, y]) => 'M' + x + ' ' + y + 'h2v2h-2z').join('');
  const CHEV = {
    up: [PX([[7, 7]]), PX([[5, 8], [7, 6], [9, 8]]), PX([[3, 9], [5, 7], [7, 5], [9, 7], [11, 9]])],
    down: [PX([[7, 7]]), PX([[5, 6], [7, 8], [9, 6]]), PX([[3, 5], [5, 7], [7, 9], [9, 7], [11, 5]])],
  };
  function drawChev(svg, dir, animate) {
    const path = svg.querySelector('path');
    clearTimeout(svg._t1); clearTimeout(svg._t2);
    if (!animate || reduce) { path.setAttribute('d', CHEV[dir][2]); return; }
    path.setAttribute('d', CHEV[dir][0]);
    svg._t1 = setTimeout(() => path.setAttribute('d', CHEV[dir][1]), 40);
    svg._t2 = setTimeout(() => path.setAttribute('d', CHEV[dir][2]), 90);
  }
  document.querySelectorAll('.nav-fold').forEach((fold) => {
    const btn = fold.querySelector('[aria-expanded]');
    const list = fold.querySelector('.nav-sub');
    const chev = btn.querySelector('.chev');
    drawChev(chev, fold.classList.contains('is-closed') ? 'down' : 'up', false);
    btn.addEventListener('click', () => {
      const closing = !fold.classList.contains('is-closed');
      btn.setAttribute('aria-expanded', String(!closing));
      drawChev(chev, closing ? 'down' : 'up', true);
      if (list._anim) list._anim.cancel();
      if (reduce) { fold.classList.toggle('is-closed', closing); return; }
      if (closing) {
        const h = list.offsetHeight;
        list.style.overflow = 'hidden';
        list._anim = list.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
          { duration: 220, easing: 'ease-in' });
        list._anim.onfinish = () => { fold.classList.add('is-closed'); list.style.overflow = ''; list._anim = null; };
      } else {
        fold.classList.remove('is-closed');
        const h = list.offsetHeight;
        list.style.overflow = 'hidden';
        list._anim = list.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }],
          { duration: 220, easing: 'ease-out' });
        list._anim.onfinish = () => { list.style.overflow = ''; list._anim = null; };
      }
    });
  });

  // ---------- Квадрат текущего раздела ----------
  // Квадрат 8×8 из 16 пикселей 2×2: на новом пункте собирается по пикселям в случайном порядке,
  // на старом через мгновение так же рассыпается.
  if (sidebar) {
    sidebar.classList.add('js-marks');
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    function markOf(item) {
      let m = item.querySelector(':scope > .mark');
      if (!m) {
        m = document.createElement('span');
        m.className = 'mark';
        m.setAttribute('aria-hidden', 'true');
        for (let k = 0; k < 16; k++) {
          const i = document.createElement('i');
          i.style.left = (k % 4) * 2 + 'px';
          i.style.top = Math.floor(k / 4) * 2 + 'px';
          m.appendChild(i);
        }
        item.appendChild(m);
      }
      return m;
    }
    function run(cells, on, total, delay) {
      if (reduce) { cells.forEach((c) => c.classList.toggle('on', on)); return; }
      const step = total / cells.length;
      shuffle(cells.slice()).forEach((c, k) => {
        clearTimeout(c._t);
        c._t = setTimeout(() => c.classList.toggle('on', on), delay + k * step);
      });
    }
    let active = sidebar.querySelector('.nav-item[aria-current="page"]');
    if (active) run(Array.from(markOf(active).children), true, 0, 0);
    function setActive(item) {
      if (!item || item === active) return;
      const old = active;
      if (old) old.removeAttribute('aria-current');
      item.setAttribute('aria-current', 'page');
      active = item;
      run(Array.from(markOf(item).children), true, 320, 0);
      if (old) run(Array.from(markOf(old).children), false, 420, 140);
    }

    // На главной: квадрат у раздела, к которому перешли или до которого докрутили
    const onHome = !!document.getElementById('cases');
    if (onHome) {
      const items = Array.from(sidebar.querySelectorAll('[data-section]'));
      const byId = (id) => items.find((i) => i.dataset.section === id);
      items.forEach((i) => i.addEventListener('click', (e) => {
        if (i.dataset.section === 'top') { e.preventDefault(); window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); history.replaceState(null, '', './'); }
        setActive(i);
        lock = Date.now() + 1500; // пока страница плавно доезжает, квадрат не перескакивает по пути
      }));
      let lock = 0;
      const sections = ['cases', 'experience'].map((id) => document.getElementById(id)).filter(Boolean);
      function spy() {
        if (Date.now() < lock) return;
        const line = window.innerHeight * 0.4;
        let id = 'top';
        sections.forEach((sec) => { if (sec.getBoundingClientRect().top < line) id = sec.id; });
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) id = sections.length ? sections[sections.length - 1].id : id;
        setActive(byId(id));
      }
      window.addEventListener('scroll', () => window.requestAnimationFrame(spy), { passive: true });
      window.addEventListener('scrollend', () => { lock = 0; });
      if (location.hash) setTimeout(spy, 50);
    }
  }

  // Звук внизу меню: включить / выключить. По умолчанию выключен, выбор запоминается.
  // Самих звуков пока нет — другие скрипты слушают событие soundchange и читают html[data-sound].
  const root = document.documentElement;
  let soundOn = false;
  try { soundOn = localStorage.getItem('sound') === 'on'; } catch (e) {}
  root.dataset.sound = soundOn ? 'on' : 'off';
  document.querySelectorAll('.js-sound').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(soundOn));
    btn.addEventListener('click', () => {
      soundOn = !soundOn;
      root.dataset.sound = soundOn ? 'on' : 'off';
      document.querySelectorAll('.js-sound').forEach((b) => b.setAttribute('aria-pressed', String(soundOn)));
      try { localStorage.setItem('sound', soundOn ? 'on' : 'off'); } catch (e) {}
      document.dispatchEvent(new CustomEvent('soundchange', { detail: soundOn }));
    });
  });

  // Кнопка внизу меню: день ↔ ночь. Выбор запоминается, без него тема идёт по времени устройства.
  document.querySelectorAll('.js-theme').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) {}
      document.dispatchEvent(new CustomEvent('themechange', { detail: next }));
    });
  });

  document.querySelectorAll('.js-copy').forEach((btn) => {
    const hint = btn.parentElement.querySelector('.copy-hint');
    let timer;
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        if (hint) {
          hint.textContent = 'Скопировано';
          hint.classList.add('is-on');
          clearTimeout(timer);
          timer = setTimeout(() => hint.classList.remove('is-on'), 1600);
        }
      } catch (e) {
        window.location.href = 'mailto:' + btn.dataset.copy;
      }
    });
  });
})();
