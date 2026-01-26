(() => {
  const nav = document.getElementById('nav');
  const dropdown = document.getElementById('dropdown');
  const btn = document.getElementById('btn');
  const circle = document.getElementById('circle');

  const linkedinLogo = document.getElementById('linkedin-logo');
  const githubLogo = document.getElementById('github-logo');
  const buttonLogo = document.getElementById('button-logo');
  const homePhrase = document.getElementById('homephrase');

  const desktopLinks = Array.from(nav.querySelectorAll('.nav-links a'));
  const dropdownLinks = Array.from(dropdown.querySelectorAll('a'));

  const MOBILE_BREAK = 920;
  
  const SECTION_THEME = {
    home: 'dark',    
    about: 'light',
    projects: 'light',
    creative: 'transparent',
  };


  // Asset mapping preserved from your original logic
  const ICONS = {
    light: {
      linkedin: 'assets/icons/LI-In-Bug.png',
      github: 'assets/icons/github-mark.png',
      button: 'assets/icons/about_mobile_black.png',
    },
    dark: {
      linkedin: 'assets/icons/LI-In-Bug-white.png',
      github: 'assets/icons/github-mark-white.png',
      button: 'assets/icons/about_mobile_white.png',
    },
  };

  function getThemeForSection(sectionId) {
    return SECTION_THEME[sectionId] || 'light';
  }

  function normalizeHash(hash) {
    return (hash || '').replace('#', '').trim();
  }

  function getActiveSectionId() {
    const activeEl = document.querySelector('.section.is-active');
    if (activeEl?.id) return activeEl.id;

    if (window.Site?.getActiveSectionId) {
      const id = window.Site.getActiveSectionId();
      if (id) return id;
    }

    // last resort: hash
    return normalizeHash(window.location.hash) || 'home';
  }

  function setNavClass(sectionId) {
    nav.className = '';
    nav.classList.add(`nav-${sectionId}`);

    const theme = getThemeForSection(sectionId);

    nav.classList.remove('theme-light', 'theme-dark', 'theme-transparent');
    nav.classList.add(`theme-${theme}`);
  }




  function setIcons(theme) {
    const isWhite = theme === 'dark' || theme === 'transparent';

    linkedinLogo.src = isWhite
        ? ICONS.dark.linkedin
        : ICONS.light.linkedin;

    githubLogo.src = isWhite
        ? ICONS.dark.github
        : ICONS.light.github;
    
    buttonLogo.src = isWhite
        ? ICONS.dark.button
        : ICONS.light.button;
    
  }

  function updateHomePhrase(sectionId) {
    if (sectionId === 'home' && window.innerWidth > MOBILE_BREAK) {
      homePhrase.classList.add('show');
      homePhrase.style.transition = 'opacity 3s ease-in-out';
      homePhrase.style.opacity = 1;
    } else {
      homePhrase.classList.remove('show');
      homePhrase.style.transition = 'opacity 0s ease-in-out';
      homePhrase.style.opacity = 0;
    }
  }

  function setAriaCurrent(sectionId) {
    const allLinks = [...desktopLinks, ...dropdownLinks];
    allLinks.forEach((a) => a.removeAttribute('aria-current'));

    // Only mark desktop link set (keeps overlay simple)
    const match = desktopLinks.find((a) => normalizeHash(a.getAttribute('href')) === sectionId);
    if (match) match.setAttribute('aria-current', 'page');
  }

  function positionCircle(sectionId, theme) {
    // Circle is only relevant on desktop (CSS hides on mobile).
    const link = desktopLinks.find((a) => normalizeHash(a.getAttribute('href')) === sectionId);

    // If we're on home (no link), hide the dot to avoid odd placement.
    if (!link) {
      circle.style.opacity = '0';
      return;
    }

  function applyCircleTheme(theme) {
        if (theme === 'light') {
            circle.style.backgroundColor = 'black';
            circle.style.opacity = '1';
        }

        if (theme === 'dark') {
            circle.style.backgroundColor = 'white';
            circle.style.opacity = '1';
        }

        if (theme === 'transparent') {
            circle.style.backgroundColor = 'white';
            circle.style.opacity = '0.35';
        }
    }

    circle.style.opacity = '1';

    applyCircleTheme(theme);


    // Compute vertical alignment relative to nav box
    const navRect = nav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();

    const circleSize = circle.getBoundingClientRect().height || 7;
    const top = (linkRect.top - navRect.top) + (linkRect.height / 2) - (circleSize / 2);

    circle.style.top = `${Math.round(top)}px`;
  }

  function applySectionState(sectionId) {
    setNavClass(sectionId);

    const theme = getThemeForSection(sectionId);
    setIcons(theme);

    setAriaCurrent(sectionId);
    updateHomePhrase(sectionId);
    positionCircle(sectionId, theme);
  }

  function closeDropdown() {
    dropdown.classList.remove('show');
    dropdown.setAttribute('aria-hidden', 'true');
    btn.setAttribute('aria-expanded', 'false');

    // Re-apply section theme after closing overlay
    applySectionState(getActiveSectionId());
  }

  function openDropdown() {
    dropdown.classList.add('show');
    dropdown.setAttribute('aria-hidden', 'false');
    btn.setAttribute('aria-expanded', 'true');

    // When overlay is open, icons should be white (preserve your original mobile behavior)
    setIcons('dark');
  }

  function toggleDropdown(event) {
    event.stopPropagation();
    if (dropdown.classList.contains('show')) closeDropdown();
    else openDropdown();
  }

  function navigateTo(sectionId) {
    // Keep hash behavior (for shareability) but drive actual transition through the existing system.
    history.replaceState(null, '', `#${sectionId}`);

    if (window.Site?.goTo) {
      window.Site.goTo(sectionId);
    }
    // If not available, we still updated the hash; state observer will handle visual state.
  }

  function onNavLinkClick(e) {
    const href = e.currentTarget.getAttribute('href');
    const sectionId = normalizeHash(href);
    if (!sectionId) return;

    e.preventDefault();
    navigateTo(sectionId);
  }

  // Observe section activation changes (no dependence on scrollY / layout)
  function watchActiveSection() {
    const sections = Array.from(document.querySelectorAll('.section'));
    const observer = new MutationObserver(() => {
      applySectionState(getActiveSectionId());
    });

    sections.forEach((s) => observer.observe(s, { attributes: true, attributeFilter: ['class'] }));

    // initial
    applySectionState(getActiveSectionId());
  }

  // Hook up events
  function init() {
    // Desktop + dropdown links
    desktopLinks.forEach((a) => a.addEventListener('click', onNavLinkClick));
    dropdownLinks.forEach((a) => a.addEventListener('click', (e) => {
      onNavLinkClick(e);
      closeDropdown();
    }));

    // Home logo click should go to home via system hook
    const homeAnchor = nav.querySelector('.logo a');
    homeAnchor.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('home');
    });

    btn.addEventListener('click', toggleDropdown);

    document.addEventListener('click', (event) => {
      if (!dropdown.contains(event.target) && !btn.contains(event.target)) {
        closeDropdown();
      }
    });

    window.addEventListener('resize', () => {
      // If leaving mobile, ensure dropdown closes
      if (window.innerWidth > MOBILE_BREAK) closeDropdown();
      // Recompute circle alignment and phrase visibility
      applySectionState(getActiveSectionId());
    });

    window.addEventListener('hashchange', () => {
      // If user manually changes hash, keep nav consistent and attempt navigation
      const id = normalizeHash(window.location.hash) || 'home';
      if (window.Site?.goTo) window.Site.goTo(id);
      applySectionState(getActiveSectionId());
    });

    watchActiveSection();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
