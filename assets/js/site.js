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
