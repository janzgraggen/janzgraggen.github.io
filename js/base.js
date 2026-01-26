window.Site = window.Site || {};

/* ============================================================
   AMBIENT BACKGROUND CONFIG
============================================================ */

const ENABLE_AMBIENT_BG = false; // toggle ambient blur system
const AMBIENT_DEFAULT_URL = 'assets/images/home/background1SW.jpeg';
const CREATIVE_DEFAULT_BG = 'assets/images/home/background.jpeg';
const AMBIENT_OPACITY = 0.82;

let CURRENT_AMBIENT_URL = null;

/* ============================================================
   AMBIENT BACKGROUND HELPERS
============================================================ */

function ensureAmbientLayer() {
  const frame = document.getElementById('frame');
  if (!frame) return null;

  let layer = document.getElementById('frame-ambient-layer');
  if (layer) return layer;

  layer = document.createElement('div');
  layer.id = 'frame-ambient-layer';
  layer.setAttribute('aria-hidden', 'true');
  frame.prepend(layer);

  return layer;
}

async function preloadImage(url) {
  await new Promise((resolve) => {
    const img = new Image();
    img.onload = resolve;
    img.onerror = resolve;
    img.src = url;
  });
}

window.Site.setAmbientBackground = async (url) => {
  const layer = ensureAmbientLayer();
  if (!layer) return;

  CURRENT_AMBIENT_URL = url;

  if (!ENABLE_AMBIENT_BG) {
    layer.style.opacity = '0';
    layer.style.backgroundImage = '';
    return;
  }

  await preloadImage(url);
  layer.style.backgroundImage = `url("${url}")`;
  layer.style.opacity = String(AMBIENT_OPACITY);
};

window.Site.clearAmbientBackgroundToWhite = () => {
  CURRENT_AMBIENT_URL = null;
  const layer = ensureAmbientLayer();
  if (!layer) return;

  layer.style.opacity = '0';
  layer.style.backgroundImage = '';
};

/* ============================================================
   SECTION TRANSITIONS + NAVIGATION DRIVER
============================================================ */

(() => {
  const sections = Array.from(document.querySelectorAll('.section'));
  const mask = document.getElementById('transition-mask');
  const transitionLabel = document.getElementById('transition-label');

  if (!sections.length || !mask) return;

  let currentIndex = 0;
  let isTransitioning = false;

  const TRANSITION_DURATION = 1000;

  const SECTION_PATH = {
    home: 'home',
    about: 'about',
    projects: 'projects',
    creative: 'creative',
  };

  function setActiveSection(index) {
    sections.forEach((section, i) => {
      section.classList.toggle('is-active', i === index);
    });
  }

  function applyAmbientVisibility(activeId) {
    const ambientLayer = document.getElementById('frame-ambient-layer');
    if (!ambientLayer) return;

    if (!ENABLE_AMBIENT_BG) {
      ambientLayer.style.opacity = '0';
      return;
    }

    // Hide blur on Home + Creative
    if (activeId === 'home' ) {
      ambientLayer.style.opacity = '0';
      return;
    }

    // Show blur elsewhere
    if (CURRENT_AMBIENT_URL) {
      ambientLayer.style.backgroundImage = `url("${CURRENT_AMBIENT_URL}")`;
    }

    ambientLayer.style.opacity = String(AMBIENT_OPACITY);
  }

  function emitSectionChange(sectionId) {
    window.dispatchEvent(new CustomEvent('site:sectionchange', {
      detail: { sectionId }
    }));
  }

  function transitionTo(index) {
    if (isTransitioning || index === currentIndex) return;
    if (index < 0 || index >= sections.length) return;

    isTransitioning = true;

    const fromId = sections[currentIndex].id;
    const toId = sections[index].id;

    // Hide creative sharp BG when leaving creative
    if (fromId === 'creative' && toId !== 'creative') {
      window.Site?.clearFrameBackground?.({ immediate: true, clearImage: false });
    }

    // Set transition label text
    if (transitionLabel) {
      transitionLabel.textContent = SECTION_PATH[toId] || toId;
      transitionLabel.style.opacity = '0';
    }

    // Fade out current section
    sections[currentIndex].classList.remove('is-active');

    // Fade to white
    mask.style.opacity = '1';
    if (transitionLabel) transitionLabel.style.opacity = '1';

    setTimeout(() => {
      currentIndex = index;
      setActiveSection(currentIndex);

      const activeId = sections[currentIndex].id;
      if (activeId === 'creative') {
        window.Site.setFrameBackground?.(CREATIVE_DEFAULT_BG, { fadeMs: 300 });
      }
      emitSectionChange(activeId);

      applyAmbientVisibility(activeId);

      // Fade back in
      if (transitionLabel) transitionLabel.style.opacity = '0';
      mask.style.opacity = '0';

      setTimeout(() => {
        isTransitioning = false;
      }, TRANSITION_DURATION);

    }, TRANSITION_DURATION);
  }

  function onWheel(e) {
    if (isTransitioning) return;

    if (e.deltaY > 40) transitionTo(currentIndex + 1);
    else if (e.deltaY < -40) transitionTo(currentIndex - 1);
  }


  // Initial state
  setActiveSection(currentIndex);
  const initialId = sections[currentIndex].id;
  emitSectionChange(initialId);

  // If Creative is first (or when entering Creative later), set default image
  if (initialId === 'creative') {
    window.Site.setFrameBackground?.(CREATIVE_DEFAULT_BG, { fadeMs: 0 });
  }


  // Initialize ambient background
  if (ENABLE_AMBIENT_BG) {
    window.Site.setAmbientBackground(AMBIENT_DEFAULT_URL);
    CURRENT_AMBIENT_URL = AMBIENT_DEFAULT_URL;
  } else {
    window.Site.clearAmbientBackgroundToWhite();
  }

  applyAmbientVisibility(initialId);

  // Public hooks
  window.Site.goTo = (sectionId) => {
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (idx !== -1) transitionTo(idx);
  };

  window.Site.getActiveSectionId = () => sections[currentIndex]?.id ?? null;

  window.addEventListener('wheel', onWheel, { passive: true });

})();

/* ============================================================
   CREATIVE BACKGROUND LAYER (SHARP IMAGE)
============================================================ */

window.Site.setFrameBackground = async (url, opts = {}) => {
  const frame = document.getElementById('frame');
  if (!frame) return;

  let layer = document.getElementById('frame-bg-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'frame-bg-layer';
    layer.setAttribute('aria-hidden', 'true');

    const blur = document.createElement('div');
    blur.className = 'bg-blur';

    const main = document.createElement('div');
    main.className = 'bg-main';

    const img = document.createElement('img');
    img.alt = '';
    img.decoding = 'async';
    img.loading = 'eager';

    main.appendChild(img);
    layer.appendChild(blur);
    layer.appendChild(main);

    frame.prepend(layer);
  }

  const fadeMs = typeof opts.fadeMs === 'number' ? opts.fadeMs : 300;

  const blurLayer = layer.querySelector('.bg-blur');
  const imgEl = layer.querySelector('.bg-main img');

  // preload & measure image
  const { w, h } = await new Promise((resolve) => {
    const img = new Image();
    img.onload = async () => {
      if (img.decode) { try { await img.decode(); } catch {} }
      resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
    };
    img.onerror = () => resolve({ w: 1, h: 1 });
    img.src = url;
  });

  const frameW = frame.clientWidth || 1;
  const frameH = frame.clientHeight || 1;

  const imgIsPortrait = h > w;
  const imgIsLandscape = w > h;
  const frameIsPortrait = frameH > frameW;

  const useContain = imgIsPortrait || (frameIsPortrait && imgIsLandscape);

  layer.classList.toggle('fit-contain', useContain);

  // Update ambient reference for other sections
  window.Site.setAmbientBackground?.(url);

  // Fade swap
  layer.style.transition = `opacity ${fadeMs}ms ease`;
  layer.style.opacity = '0';

  requestAnimationFrame(() => {
    blurLayer.style.backgroundImage = `url("${url}")`;
    imgEl.src = url;
    layer.style.opacity = '1';
  });
};

window.Site.clearFrameBackground = (opts = {}) => {
  const layer = document.getElementById('frame-bg-layer');
  if (!layer) return;

  const fadeMs = typeof opts.fadeMs === 'number' ? opts.fadeMs : 220;
  const immediate = !!opts.immediate;

  if (immediate) {
    layer.style.transition = 'none';
    layer.style.opacity = '0';

    if (opts.clearImage) {
      const blur = layer.querySelector('.bg-blur');
      const img = layer.querySelector('.bg-main img');
      if (blur) blur.style.backgroundImage = '';
      if (img) img.removeAttribute('src');
    }

    requestAnimationFrame(() => { layer.style.transition = ''; });
    return;
  }

  layer.style.transition = `opacity ${fadeMs}ms ease`;
  layer.style.opacity = '0';
};
