(() => {
  const el = document.getElementById('frameTitlePath');
  const nav = document.getElementById('nav');
  if (!el || !nav) return;

  const PATHS = {
    home: '/janzgraggen',
    about: '/janzgraggen',
    projects: '/janzgraggen',
    creative: '/janzgraggen',
  };

const SECTION_THEME = {
  home: 'dark',
  about: 'light',
  projects: 'light',
  creative: 'transparent',
};


function applyThemeFromSection(sectionId) {
  el.classList.remove('theme-light', 'theme-dark', 'theme-transparent');
  el.classList.add(`theme-${SECTION_THEME[sectionId] || 'light'}`);
}

  function setTitlePath(sectionId) {
    el.textContent = PATHS[sectionId] || PATHS.home;
    applyThemeFromSection(sectionId);
  }

  window.addEventListener('site:sectionchange', (e) => {
    setTitlePath(e.detail.sectionId);
  });

  // initial paint
  const initial = document.querySelector('.section.is-active')?.id || 'home';
  setTitlePath(initial);
})();
