window.Site = window.Site || {};

/* ============================================================
   TOP-LEVEL CONFIG
============================================================ */

// Section navigation
const ENABLE_SECTION_NAV_BUTTONS = true; // master toggle for up/down nav
const ENABLE_AMBIENT_TOGGLE_BUTTON = true; // shows BLUR/WHITE toggle only if nav is enabled

// Ambient background defaults
const ENABLE_AMBIENT_BG = true; // default initial state (can be toggled at runtime)
const AMBIENT_FIXED_URL = 'assets/images/bg/bg.jpg';
const AMBIENT_DEFAULT_URL = AMBIENT_FIXED_URL;
const AMBIENT_OPACITY = 1;

// Creative background default (change to an existing file)
const CREATIVE_DEFAULT_BG = 'assets/images/home/bg0Color.jpg';

// Button labels/symbols (configure here)
const NAV_UP_SYMBOL = '↑';
const NAV_DOWN_LABEL = '↓';
const AMBIENT_ON_LABEL = 'WHITE';
const AMBIENT_OFF_LABEL = 'BLUR';

// Optional: hide ambient toggle button on these section IDs
const HIDE_AMBIENT_TOGGLE_ON_SECTIONS = new Set(['home', 'creative']);

/* ============================================================
   RUNTIME STATE
============================================================ */

let AMBIENT_ENABLED = ENABLE_AMBIENT_BG; // runtime ambient state (UI toggles this)
let CURRENT_AMBIENT_URL = null;          // sticky ambient url (static now)

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

  if (!AMBIENT_ENABLED) {
    CURRENT_AMBIENT_URL = null;
    layer.style.opacity = '0';
    layer.style.backgroundImage = '';
    return;
  }

  // Avoid redundant work / flicker
  if (CURRENT_AMBIENT_URL === url && layer.style.backgroundImage) {
    layer.style.opacity = String(AMBIENT_OPACITY);
    return;
  }

  await preloadImage(url);
  CURRENT_AMBIENT_URL = url;
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

// Clean hook for UI toggling (STATIC ambient only)
window.Site.setAmbientEnabled = async (enabled) => {
  AMBIENT_ENABLED = !!enabled;

  const layer = ensureAmbientLayer();
  if (!layer) return;

  if (!AMBIENT_ENABLED) {
    window.Site.clearAmbientBackgroundToWhite();
    return;
  }

  // Static: always use the same ambient image
  await window.Site.setAmbientBackground(AMBIENT_FIXED_URL);

  // Re-apply section visibility rule immediately
  const activeId =
    window.Site.getActiveSectionId?.() ||
    document.querySelector('.section.is-active')?.id ||
    null;

  if (activeId) {
    const opacity = (activeId === 'home') ? '0' : String(AMBIENT_OPACITY);
    layer.style.opacity = opacity;
  } else {
    layer.style.opacity = String(AMBIENT_OPACITY);
  }
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

    if (!AMBIENT_ENABLED) {
      ambientLayer.style.opacity = '0';
      return;
    }

    // Keep hidden on Home (existing behavior)
    if (activeId === 'home') {
      ambientLayer.style.opacity = '0';
      return;
    }

    const url = CURRENT_AMBIENT_URL || AMBIENT_DEFAULT_URL;

    if (!ambientLayer.style.backgroundImage || CURRENT_AMBIENT_URL !== url) {
      CURRENT_AMBIENT_URL = url;
      ambientLayer.style.backgroundImage = `url("${url}")`;
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
    const activeSection = sections[currentIndex];
    if (!activeSection) return false;

    const target = e.target instanceof Element ? e.target : null;
    if (!target) return false;

    const scrollParent = getScrollableParent(target, activeSection);
    if (!scrollParent) return false;

    const st = scrollParent.scrollTop;
    const max = scrollParent.scrollHeight - scrollParent.clientHeight;

    if (direction === 1) return st < max - 1;
    if (direction === -1) return st > 1;
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

    if (Math.abs(dy) < SWIPE_LOCK_AXIS_PX) return;
    if (Math.abs(dx) > Math.abs(dy)) return;

    const dt = Date.now() - touchStartT;
    if (dt > SWIPE_MAX_TIME_MS) return;

    if (Math.abs(dy) >= SWIPE_MIN_DISTANCE_PX) {
      const direction = dy > 0 ? 1 : -1;

      if (shouldLetElementScroll(e, direction)) return;

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
     SECTION NAV UI (UP/DOWN + AMBIENT TOGGLE)
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
        gap: 6px;
        z-index: 25;
        pointer-events: auto;
        align-items: center;
        font-family: inherit;
        justify-content: flex-start;
      }

      .sectionNavBtn {
        border: none;
        background: rgba(255,255,255,0.16);
        color: rgba(0, 0, 0, 0.34);
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
        width: 66px;
        height: 22px;
        border-radius: 999px;
        font-size: 12px;
        line-height: 22px;
        text-align: center;
        padding: 0;
      }

      .sectionNavBtn--down {
        width: 66px;
        height: 22px;
        border-radius: 999px;
        padding: 0 14px;
        font-size: 11px;
        letter-spacing: 0.02em;
        line-height: 22px;
        white-space: nowrap;
      }

      .sectionNavBtn--toggle {
        height: 22px;
        border-radius: 999px;
        padding: 0 10px;
        font-size: 10px;
        letter-spacing: 0.04em;
        line-height: 22px;
        text-transform: uppercase;
        white-space: nowrap;
      }
    `;
    document.head.appendChild(style);
  }

  function getAmbientToggleLabel() {
    return AMBIENT_ENABLED ? AMBIENT_ON_LABEL : AMBIENT_OFF_LABEL;
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
    btnUp.textContent = NAV_UP_SYMBOL;

    // Conditionally create ambient toggle button
    let btnToggle = null;
    if (ENABLE_SECTION_NAV_BUTTONS && ENABLE_AMBIENT_TOGGLE_BUTTON) {
      btnToggle = document.createElement('button');
      btnToggle.type = 'button';
      btnToggle.className = 'sectionNavBtn sectionNavBtn--toggle';
      btnToggle.setAttribute('aria-label', 'Toggle ambient background');
      btnToggle.setAttribute('aria-pressed', String(AMBIENT_ENABLED));
      btnToggle.textContent = getAmbientToggleLabel();
    }

    const btnDown = document.createElement('button');
    btnDown.type = 'button';
    btnDown.className = 'sectionNavBtn sectionNavBtn--down';
    btnDown.setAttribute('aria-label', 'Go to next section');

    btnUp.addEventListener('click', () => transitionTo(currentIndex - 1));

    if (btnToggle) {
      btnToggle.addEventListener('click', async () => {
        AMBIENT_ENABLED = !AMBIENT_ENABLED;
        btnToggle.setAttribute('aria-pressed', String(AMBIENT_ENABLED));
        btnToggle.textContent = getAmbientToggleLabel();

        await window.Site.setAmbientEnabled?.(AMBIENT_ENABLED);

        const activeId = sections[currentIndex]?.id;
        if (activeId) applyAmbientVisibility(activeId);

        updateSectionNav();
      });
    }

    btnDown.addEventListener('click', () => transitionTo(currentIndex + 1));

    wrap.appendChild(btnUp);
    if (btnToggle) wrap.appendChild(btnToggle);
    wrap.appendChild(btnDown);

    frame.appendChild(wrap);

    return { wrap, btnUp, btnToggle, btnDown };
  }

  const sectionNav = ENABLE_SECTION_NAV_BUTTONS ? createSectionNav() : null;

  function updateSectionNav() {
    if (!sectionNav) return;

    const wrap = sectionNav.wrap;
    const btnUp = sectionNav.btnUp;
    const btnDown = sectionNav.btnDown;
    const btnToggle = sectionNav.btnToggle;

    const activeId = sections[currentIndex]?.id;
    const isFirst = currentIndex <= 0;
    const isLast = currentIndex >= sections.length - 1;

    // Toggle button: only if it exists
    if (btnToggle) {
      const hideToggle = HIDE_AMBIENT_TOGGLE_ON_SECTIONS.has(activeId);
      btnToggle.style.display = hideToggle ? 'none' : '';
      btnToggle.setAttribute('aria-pressed', String(AMBIENT_ENABLED));
      btnToggle.textContent = getAmbientToggleLabel();
    }

    // Remove Up on first, remove Down on last
    btnUp.style.display = isFirst ? 'none' : '';
    btnDown.style.display = isLast ? 'none' : '';
    btnUp.disabled = isFirst;
    btnDown.disabled = isLast;

    // Center what remains
    if (wrap) wrap.style.justifyContent = 'center';

    // Down label
    if (!isLast) btnDown.textContent = NAV_DOWN_LABEL;
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
  if (AMBIENT_ENABLED) {
    window.Site.setAmbientEnabled(true);
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

  /* ============================================================
     TOUCH HANDLERS (defined after init to keep structure minimal)
  ============================================================ */

  // (functions already declared above; this comment just preserves the file layout)
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

  // NOTE: Ambient no longer tracks this background (ambient is static only)
  // window.Site.setAmbientBackground?.(url);

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
