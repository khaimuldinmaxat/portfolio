// Боковое меню: имя раскрывает контакты, «Кейсы» сворачивают список. Почта копируется по клику.
(function () {
  const sidebar = document.querySelector('.sidebar');
  const nameBtn = document.querySelector('.sidebar__name');
  if (sidebar && nameBtn) {
    nameBtn.addEventListener('click', () => {
      const open = sidebar.classList.toggle('is-open');
      nameBtn.setAttribute('aria-expanded', String(open));
    });
  }

  const cases = document.querySelector('.sidebar__cases');
  const casesBtn = document.querySelector('.sidebar__cases-btn');
  if (cases && casesBtn) {
    casesBtn.addEventListener('click', () => {
      // В мобильном меню список кейсов скрыт — ведём к блоку кейсов на главной
      if (window.matchMedia('(max-width: 1023px)').matches) {
        window.location.href = casesBtn.dataset.href || '#cases';
        return;
      }
      const closed = cases.classList.toggle('is-closed');
      casesBtn.setAttribute('aria-expanded', String(!closed));
    });
  }

  // «Настройки» внизу меню: день ↔ ночь. Выбор запоминается, без него тема идёт по времени устройства.
  document.querySelectorAll('.js-theme').forEach((btn) => {
    btn.addEventListener('click', () => {
      const root = document.documentElement;
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
