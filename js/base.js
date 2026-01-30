window.Site = window.Site || {};

/* ============================================================
   AMBIENT BACKGROUND CONFIG
============================================================ */

const ENABLE_AMBIENT_BG = false; // toggle ambient blur system
const ENABLE_SECTION_NAV_BUTTONS = true; // toggle section up/down buttons
const AMBIENT_DEFAULT_URL = 'assets/images/home/bg0.jpg';
const CREATIVE_DEFAULT_BG = 'assets/images/home/bg0Color.jpg';
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

  /* ============================================================
     TOUCH SWIPE (MOBILE)
  ============================================================ */

  const SWIPE_MIN_DISTANCE_PX = 80;
  const SWIPE_MAX_TIME_MS = 700;
  const SWIPE_LOCK_AXIS_PX = 12;

  let touchStartY = 0;
  let touchStartX = 0;
  let touchStartT = 0;
  let touchActive = false;
  let swipeConsumed = false;

  function getScrollableParent(el, boundaryEl) {
    let node = el;
    while (node && node !== document.body && node !== boundaryEl) {
      if (node instanceof HTMLElement) {
        const style = window.getComputedStyle(node);
        const overflowY = style.overflowY;
        const canScrollY = (overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 2;
        if (canScrollY) return node;
      }
      node = node.parentElement;
    }
    return null;
  }

  function shouldLetElementScroll(e, direction) {
    // direction: +1 => next section (finger moves up / content would scroll down)
    // direction: -1 => prev section (finger moves down / content would scroll up)
    const activeSection = sections[currentIndex];
    if (!activeSection) return false;

    const target = e.target instanceof Element ? e.target : null;
    if (!target) return false;

    const scrollParent = getScrollableParent(target, activeSection);
    if (!scrollParent) return false;

    const st = scrollParent.scrollTop;
    const max = scrollParent.scrollHeight - scrollParent.clientHeight;

    // If the inner scroller can still scroll in the gesture direction, don't hijack it.
    if (direction === 1) {
      // user swipes up -> would normally scroll DOWN (increase scrollTop)
      return st < max - 1;
    }
    if (direction === -1) {
      // user swipes down -> would normally scroll UP (decrease scrollTop)
      return st > 1;
    }
    return false;
  }

  function onTouchStart(e) {
    if (isTransitioning) return;
    if (!e.touches || e.touches.length !== 1) return;

    touchActive = true;
    swipeConsumed = false;

    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
    touchStartT = Date.now();
  }

  function onTouchMove(e) {
    if (!touchActive || swipeConsumed) return;
    if (isTransitioning) return;
    if (!e.touches || e.touches.length !== 1) return;

    const y = e.touches[0].clientY;
    const x = e.touches[0].clientX;
    const dy = touchStartY - y; // positive => swipe up
    const dx = touchStartX - x;

    // Don’t trigger until we’re confident it's vertical
    if (Math.abs(dy) < SWIPE_LOCK_AXIS_PX) return;
    if (Math.abs(dx) > Math.abs(dy)) return;

    const dt = Date.now() - touchStartT;
    if (dt > SWIPE_MAX_TIME_MS) return;

    if (Math.abs(dy) >= SWIPE_MIN_DISTANCE_PX) {
      const direction = dy > 0 ? 1 : -1;

      // Allow inner scrollables to scroll naturally if they can.
      if (shouldLetElementScroll(e, direction)) return;

      // We are taking over the gesture, so prevent native scroll/bounce.
      if (e.cancelable) e.preventDefault();

      swipeConsumed = true;
      transitionTo(currentIndex + direction);
    }
  }

  function onTouchEnd() {
    touchActive = false;
    swipeConsumed = false;
  }

  /* ============================================================
     SECTION NAV UI (UP/DOWN)
  ============================================================ */

  function ensureSectionNavStyles() {
    if (document.getElementById('site-section-nav-styles')) return;

    const style = document.createElement('style');
    style.id = 'site-section-nav-styles';
    style.textContent = `
      .sectionNav {
        position: absolute;
        left: 50%;
        bottom: 10px;
        transform: translateX(-50%);
        display: flex;
        gap: 2px;
        z-index: 25;
        pointer-events: auto;
        align-items: center;
        font-family: inherit;
      }

      .sectionNavBtn {
        border: none;
        background: rgba(255,255,255,0.16);
         color: rgba(0, 0, 0, 0.30); /* adjust opacity + tone */
        cursor: pointer;
        backdrop-filter: blur(10px) saturate(140%);
        -webkit-backdrop-filter: blur(10px) saturate(140%);
        box-shadow:
          0 10px 22px rgba(0,0,0,0.16),
          inset 0 1px 0 rgba(255,255,255,0.35),
          inset 0 -1px 0 rgba(0,0,0,0.12);
        transition: transform 120ms ease, opacity 120ms ease, background-color 120ms ease;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
      }

      .sectionNavBtn:active {
        transform: scale(0.98);
      }

      .sectionNavBtn[disabled] {
        opacity: 0.35;
        cursor: default;
        transform: none;
      }

      .sectionNavBtn--up {
        width: 56px;
        height: 16px;
        border-radius: 999px;
        font-size: 10px;
        line-height: 16px;
        text-align: center;
        padding: 0;
      }

      .sectionNavBtn--down {
        height: 16px;
        border-radius: 999px;
        padding: 0 12px;
        font-size: 10px;
        letter-spacing: 0.02em;
        line-height: 16px;
        white-space: nowrap;
      }
    `;
    document.head.appendChild(style);
  }

  function createSectionNav() {
    ensureSectionNavStyles();

    const frame = document.getElementById('frame');
    if (!frame) return null;

    if (document.getElementById('sectionNav')) {
      return document.getElementById('sectionNav');
    }

    const wrap = document.createElement('div');
    wrap.id = 'sectionNav';
    wrap.className = 'sectionNav';
    wrap.setAttribute('aria-label', 'Section navigation');

    const btnUp = document.createElement('button');
    btnUp.type = 'button';
    btnUp.className = 'sectionNavBtn sectionNavBtn--up';
    btnUp.setAttribute('aria-label', 'Go to previous section');
    btnUp.textContent = '↑';

    const btnDown = document.createElement('button');
    btnDown.type = 'button';
    btnDown.className = 'sectionNavBtn sectionNavBtn--down';
    btnDown.setAttribute('aria-label', 'Go to next section');

    btnUp.addEventListener('click', () => transitionTo(currentIndex - 1));
    btnDown.addEventListener('click', () => transitionTo(currentIndex + 1));

    wrap.appendChild(btnUp);
    wrap.appendChild(btnDown);

    frame.appendChild(wrap);

    return { wrap, btnUp, btnDown };
  }

  function formatSectionLabel(sectionId) {
    const name = (SECTION_PATH[sectionId] || sectionId || '').toUpperCase();
    return `↓ next`;
  }

  const sectionNav = ENABLE_SECTION_NAV_BUTTONS ? createSectionNav() : null;


  function updateSectionNav() {
    if (!sectionNav) return;
    const btnUp = sectionNav.btnUp;
    const btnDown = sectionNav.btnDown;

    btnUp.disabled = currentIndex <= 0;
    btnDown.disabled = currentIndex >= sections.length - 1;

    const next = sections[currentIndex + 1];
  if (next) {
  btnDown.textContent = formatSectionLabel();
  btnDown.disabled = false;
  btnDown.style.opacity = '1';
} else {
  // Last section: keep visible, but faded + inactive
  btnDown.textContent = '↓ next';
  btnDown.disabled = true;
  btnDown.style.opacity = '0.35';
}

  }

  /* ============================================================
     INIT
  ============================================================ */

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

  // Touch handlers: attach to viewport so it works on mobile reliably.
  const viewport = document.getElementById('viewport') || window;
  if (viewport && viewport.addEventListener) {
    viewport.addEventListener('touchstart', onTouchStart, { passive: true });
    viewport.addEventListener('touchmove', onTouchMove, { passive: false });
    viewport.addEventListener('touchend', onTouchEnd, { passive: true });
    viewport.addEventListener('touchcancel', onTouchEnd, { passive: true });
  }

  // Keep buttons in sync
  if (ENABLE_SECTION_NAV_BUTTONS) {
  updateSectionNav();
  window.addEventListener('site:sectionchange', updateSectionNav);
  }


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
