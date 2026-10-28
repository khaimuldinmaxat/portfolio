// Меню-бургер в мобилке и выпадающие списки «Связаться».
(function () {
  const header = document.querySelector('.header');
  const burger = document.querySelector('.burger');

  if (header && burger) {
    burger.addEventListener('click', () => {
      const open = header.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    });
    header.querySelectorAll('.menu a').forEach((a) =>
      a.addEventListener('click', () => {
        header.classList.remove('menu-open');
        burger.setAttribute('aria-expanded', 'false');
      })
    );
  }

  const contacts = document.querySelectorAll('.contact');
  contacts.forEach((c) => {
    const btn = c.querySelector('.contact__btn');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = !c.classList.contains('is-open');
      contacts.forEach((o) => {
        o.classList.remove('is-open');
        o.querySelector('.contact__btn').setAttribute('aria-expanded', 'false');
      });
      c.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  // На десктопе список открывается наведением: когда курсор ушёл — закрываем,
  // даже если перед этим по кнопке кликнули.
  const desktopHover = window.matchMedia('(hover: hover) and (min-width: 1024px)');
  contacts.forEach((c) => {
    c.addEventListener('mouseleave', () => {
      if (!desktopHover.matches) return;
      const btn = c.querySelector('.contact__btn');
      c.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      if (c.contains(document.activeElement)) document.activeElement.blur();
    });
  });

  const closeAll = () => {
    contacts.forEach((o) => {
      o.classList.remove('is-open');
      o.querySelector('.contact__btn').setAttribute('aria-expanded', 'false');
    });
    if (header && burger && header.classList.contains('menu-open')) {
      header.classList.remove('menu-open');
      burger.setAttribute('aria-expanded', 'false');
    }
  };
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.contact')) contacts.forEach((o) => o.classList.remove('is-open'));
    if (header && !e.target.closest('.header') && header.classList.contains('menu-open')) {
      header.classList.remove('menu-open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });
})();

// Карточка кейса реагирует, когда оказывается под курсором при прокрутке.
// Браузер обновляет :hover только после движения мыши, поэтому подсвечиваем сами.
(function () {
  const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (!document.querySelector('.case-card')) return;
  let x = -1, y = -1, current = null, queued = false;
  const set = (card) => {
    if (card === current) return;
    if (current) current.classList.remove('is-hover');
    if (card) card.classList.add('is-hover');
    current = card;
  };
  const update = () => {
    queued = false;
    if (!mq.matches || x < 0) return set(null);
    const el = document.elementFromPoint(x, y);
    set(el && el.closest ? el.closest('.case-card') : null);
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  document.addEventListener('mousemove', (e) => { x = e.clientX; y = e.clientY; queue(); }, { passive: true });
  window.addEventListener('scroll', queue, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { x = -1; queue(); });
  window.addEventListener('blur', () => { x = -1; queue(); });
})();

// Картинки в кейсах открываются крупно по нажатию (как лайтбокс в референсе).
(function () {
  const body = document.querySelector('.case-body');
  if (!body) return;
  const imgs = body.querySelectorAll('img');
  if (!imgs.length) return;

  const box = document.createElement('div');
  box.className = 'lightbox';
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Картинка крупно');
  box.innerHTML = '<button class="lightbox__close" type="button" aria-label="Закрыть"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button><div class="lightbox__stage"><img class="lightbox__img" alt=""></div>';
  document.body.appendChild(box);
  const big = box.querySelector('.lightbox__img');
  const closeBtn = box.querySelector('.lightbox__close');
  let opener = null;

  // самый крупный вариант из srcset
  const largest = (img) => {
    const set = (img.getAttribute('srcset') || '').split(',').map((s) => s.trim().split(/\s+/));
    const best = set.filter((x) => x[0]).sort((a, b) => parseInt(b[1] || '0', 10) - parseInt(a[1] || '0', 10))[0];
    return best ? best[0] : img.currentSrc || img.src;
  };
  // Размер: на десктопе — вдвое крупнее, чем в кейсе, но не шире окна (высокие экраны листаются);
  // на телефоне — во всю ширину. Браузер берёт из srcset вариант ровно под этот размер, без мыла.
  const open = (img) => {
    opener = img;
    const base = parseInt(img.getAttribute('width'), 10) || img.naturalWidth;
    const pad = window.innerWidth >= 1024 ? 144 : 24;
    const maxW = window.innerWidth - pad;
    const w = Math.round(window.innerWidth >= 1024 ? Math.min(maxW, base * 2) : maxW);
    big.style.width = w + 'px';
    big.sizes = w + 'px';
    big.srcset = img.getAttribute('srcset') || '';
    big.src = largest(img);
    big.alt = img.alt;
    box.scrollTop = 0;
    box.hidden = false;
    document.documentElement.classList.add('lightbox-open');
    closeBtn.focus();
  };
  const close = () => {
    box.hidden = true;
    big.removeAttribute('srcset');
    big.removeAttribute('src');
    document.documentElement.classList.remove('lightbox-open');
    if (opener) opener.focus();
  };

  imgs.forEach((img) => {
    img.classList.add('zoomable');
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', (img.alt ? img.alt + '. ' : '') + 'Открыть крупно');
    img.addEventListener('click', () => open(img));
    img.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(img); }
    });
  });
  box.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') { e.preventDefault(); closeBtn.focus(); }
  });
})();
