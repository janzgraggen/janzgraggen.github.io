window.Site = window.Site || {};

/* ============================================================
   TOP-LEVEL CONFIG
============================================================ */

// Section navigation
const ENABLE_SECTION_NAV_BUTTONS = true; // master toggle for up/down nav
const ENABLE_AMBIENT_TOGGLE_BUTTON = false; // shows BLUR/WHITE toggle only if nav is enabled

// New navigation mode toggles (default true)
const ENABLE_INTENT_SCROLL_NAV = true;     // scroll-and-hold section changes via wheel/touch boundary intent
const ENABLE_KEYBOARD_SECTION_NAV = true;  // ArrowUp/ArrowDown section changes
const ENABLE_SWIPE_SECTION_NAV = true;     // swipe gesture section changes (mobile)

// Intent gesture tuning (only used if ENABLE_INTENT_SCROLL_NAV === true)
const INTENT_PROGRESS_THRESHOLD = 320; // legacy scale for progress (now time-mapped)
const INTENT_DECAY_MS = 260;           // (kept for compatibility; cancel is crisp)
const INTENT_COOLDOWN_MS = 900;        // lock after transition
const FRAME_NUDGE_PX = 28;             // visual nudge
const INTENT_INDICATOR_HEIGHT_PX = 28; // reserved (text lives in revealed strip)

// “scroll and hold” timing model (primary feel controls)
const INTENT_HOLD_TO_CONFIRM_MS = 920; // time required to complete hold
const INTENT_KEEPALIVE_MS = 450;       // touch-only keepalive (wheel should not depend on this)
const INTENT_MIN_ACTIVITY_DELTA = 0.3; // ignore micro-noise

// Extra intent guards (kept; now mostly redundant due to time gating)
const INTENT_MIN_HOLD_MS = 380;        // legacy minimum time (kept)
const INTENT_WHEEL_MAX_STEP = 34;      // legacy clamp (kept)
const INTENT_TOUCH_MAX_STEP = 22;      // legacy clamp (kept)
const INTENT_DAMP_FAST_DELTA = 140;    // legacy damp (kept)
const INTENT_MIN_EVENT_DT_MS = 34;     // legacy damp (kept)

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

window.Site.setAmbientEnabled = async (enabled) => {
  AMBIENT_ENABLED = !!enabled;

  const layer = ensureAmbientLayer();
  if (!layer) return;

  if (!AMBIENT_ENABLED) {
    window.Site.clearAmbientBackgroundToWhite();
    return;
  }

  await window.Site.setAmbientBackground(AMBIENT_FIXED_URL);

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

  /* ============================================================
     INTENT UI STATE (scroll-and-hold)
  ============================================================ */

  const frame = document.getElementById('frame');
  const REVEAL_STRIP_PX = FRAME_NUDGE_PX + 16;

  let intentDir = 0; // 1 => next, -1 => prev
  let intentActive = false;
  let intentStartT = 0;
  let intentLastEventT = 0;
  let cooldownUntilT = 0;
  let intentCancelTimer = 0;
  let intentRaf = 0;

  // NEW: track the input source so we only use keepalive cancel for touch
  let intentSource = ''; // 'wheel' | 'touch' | ''

  function isInCooldown() {
    return Date.now() < cooldownUntilT;
  }

  function markCooldown() {
    cooldownUntilT = Date.now() + INTENT_COOLDOWN_MS;
  }

  function ensureIntentStyles() {
    if (document.getElementById('site-intent-styles')) return;

    const style = document.createElement('style');
    style.id = 'site-intent-styles';
    style.textContent = `
      /* Outer underlay frame: matches #frame radius/shadow via JS */
      #intent-underlay-frame {
        position: absolute;
        pointer-events: none;
        z-index: 0;
        opacity: 0;
        overflow: hidden; /* clip to rounded corners */
        background: transparent;
      }

      /* Inner reveal surface: clipped to thin strip */
      #intent-underlay-reveal {
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.28);
        clip-path: inset(100% 0 0 0);
      }
      #intent-underlay-frame.is-next #intent-underlay-reveal {
        clip-path: inset(calc(100% - var(--reveal-strip)) 0 0 0);
      }
      #intent-underlay-frame.is-prev #intent-underlay-reveal {
        clip-path: inset(0 0 calc(100% - var(--reveal-strip)) 0);
      }

      /* Intent label: two stacked layers (base + fill) */
      #intent-label {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        width: min(520px, calc(76%));
        font: inherit;
        font-size: 10px;     /* adjust */
        font-weight: 800;    /* adjust */
        text-transform: uppercase;
        white-space: nowrap;
        overflow: hidden;
        opacity: 0;
      }

      #intent-label .base,
      #intent-label .fill {
        display: block;
        width: 100%;
        text-align: center;
      }

      #intent-label .base {
        color: rgba(0,0,0,0.28);
      }

      #intent-label .fillWrap {
        position: absolute;
        inset: 0;
        overflow: hidden;
        /* fill revealed from left -> right by clip-path */
        clip-path: inset(0 100% 0 0);
      }

      #intent-label .fill {
        color: rgba(0,0,0,0.68);
      }
    `;
    document.head.appendChild(style);
  }

  function hardCleanupIntentArtifacts() {
    const wrap = document.getElementById('intent-frame-wrap');
    if (wrap && frame && wrap.contains(frame) && wrap.parentElement) {
      const p = wrap.parentElement;
      p.insertBefore(frame, wrap);
      wrap.remove();
    }

    const u = document.getElementById('intent-underlay-frame');
    if (u && frame && u.parentElement !== frame.parentElement) {
      u.remove();
    }
  }

  function alignUnderlayToFrame(underlay) {
    if (!frame || !underlay) return;

    const cs = getComputedStyle(frame);

    // Match typography of the main frame
    underlay.style.fontFamily = cs.fontFamily || '';
    underlay.style.fontSize = cs.fontSize || '';
    underlay.style.lineHeight = cs.lineHeight || '';
    underlay.style.letterSpacing = cs.letterSpacing || '';

    // Copy exact inset geometry from #frame so bounds match 1:1 in the same containing block.
    underlay.style.top = cs.top;
    underlay.style.right = cs.right;
    underlay.style.bottom = cs.bottom;
    underlay.style.left = cs.left;

    // Match radius + shadow to main frame
    underlay.style.borderRadius = cs.borderRadius || '12px';
    underlay.style.boxShadow = cs.boxShadow || '';

    if (!frame.style.zIndex) frame.style.zIndex = '1';

    underlay.style.setProperty('--reveal-strip', `${Math.max(8, REVEAL_STRIP_PX)}px`);
  }

  function ensureUnderlayFrame() {
    if (!frame) return null;
    ensureIntentStyles();
    hardCleanupIntentArtifacts();

    const parent = frame.parentElement;
    if (!parent) return null;

    let underlay = document.getElementById('intent-underlay-frame');
    if (!underlay) {
      underlay = document.createElement('div');
      underlay.id = 'intent-underlay-frame';
      underlay.setAttribute('aria-hidden', 'true');

      const reveal = document.createElement('div');
      reveal.id = 'intent-underlay-reveal';
      reveal.setAttribute('aria-hidden', 'true');

      const label = document.createElement('div');
      label.id = 'intent-label';
      label.setAttribute('aria-hidden', 'true');

      const base = document.createElement('span');
      base.className = 'base';

      const fillWrap = document.createElement('span');
      fillWrap.className = 'fillWrap';

      const fill = document.createElement('span');
      fill.className = 'fill';

      fillWrap.appendChild(fill);
      label.appendChild(base);
      label.appendChild(fillWrap);

      reveal.appendChild(label);
      underlay.appendChild(reveal);

      parent.insertBefore(underlay, frame);
    }

    alignUnderlayToFrame(underlay);
    return underlay;
  }

  function setFrameTranslateY(px, animateIn) {
    if (!frame) return;

    if (animateIn) frame.style.transition = 'transform 90ms ease';
    else frame.style.transition = 'none';

    frame.style.transform = px ? `translateY(${px}px)` : '';

    if (!animateIn) {
      requestAnimationFrame(() => { if (frame) frame.style.transition = ''; });
    }
  }

  function setLabelPosition(dir) {
    const label = document.getElementById('intent-label');
    if (!label) return;

    const strip = Math.max(8, REVEAL_STRIP_PX);
    const desired = 6;
    const offset = Math.min(desired, Math.max(1, strip - 18));

    label.style.top = '';
    label.style.bottom = '';
    if (dir === -1) label.style.top = `${offset}px`;
    else label.style.bottom = `${offset}px`;
  }

  function getTargetLabelForDir(dir) {
    const idx = currentIndex + dir;
    const target = sections[idx];
    const targetId = target?.id || '';
    const path = SECTION_PATH[targetId] || targetId || '';
    const pretty = path ? `/${String(path).toUpperCase()}` : '/';
    return dir === 1 ? `  GO TO  ${pretty} ` : `BACK TO ${pretty}`;
  }

  function setLabelProgress(progress01) {
    const label = document.getElementById('intent-label');
    if (!label) return;
    const fillWrap = label.querySelector('.fillWrap');
    if (!fillWrap) return;

    const p = Math.max(0, Math.min(1, progress01));
    fillWrap.style.clipPath = `inset(0 ${Math.round((1 - p) * 100)}% 0 0)`;
  }

  function showIntentUI(dir, progress01) {
    const underlay = ensureUnderlayFrame();
    if (!underlay) return;

    underlay.classList.toggle('is-next', dir === 1);
    underlay.classList.toggle('is-prev', dir === -1);
    underlay.style.opacity = '1';

    setLabelPosition(dir);

    const label = document.getElementById('intent-label');
    if (label) {
      const txt = getTargetLabelForDir(dir);
      const base = label.querySelector('.base');
      const fill = label.querySelector('.fill');
      if (base) base.textContent = txt;
      if (fill) fill.textContent = txt;
      label.style.opacity = '1';
    }

    setLabelProgress(progress01);

    const signed = dir === 1 ? -1 : 1;
    setFrameTranslateY(signed * FRAME_NUDGE_PX, true);

    alignUnderlayToFrame(underlay);
  }

  function hideIntentUI() {
    const underlay = document.getElementById('intent-underlay-frame');
    if (underlay) {
      underlay.style.opacity = '0';
      underlay.classList.remove('is-next', 'is-prev');
    }

    const label = document.getElementById('intent-label');
    if (label) {
      label.style.opacity = '0';
      setLabelProgress(0);
      label.style.top = '';
      label.style.bottom = '';
    }
  }

  function stopIntentTicker() {
    if (intentRaf) cancelAnimationFrame(intentRaf);
    intentRaf = 0;
  }

  function cancelIntentImmediate() {
    intentDir = 0;
    intentActive = false;
    intentStartT = 0;
    intentLastEventT = 0;
    intentSource = '';

    stopIntentTicker();

    if (intentCancelTimer) clearTimeout(intentCancelTimer);
    intentCancelTimer = 0;

    hideIntentUI();
    setFrameTranslateY(0, false);
  }

  function scheduleKeepAliveCancelTouchOnly() {
    // Touch has reliable "end"; keepalive is just a safety net.
    if (intentSource !== 'touch') return;

    if (intentCancelTimer) clearTimeout(intentCancelTimer);
    intentCancelTimer = setTimeout(() => {
      if (!intentActive) return;
      const now = Date.now();
      if (now - intentLastEventT > INTENT_KEEPALIVE_MS) {
        cancelIntentImmediate();
      } else {
        scheduleKeepAliveCancelTouchOnly();
      }
    }, Math.max(80, INTENT_KEEPALIVE_MS + 10));
  }

  function tickIntent() {
    if (!intentActive || !intentDir) { stopIntentTicker(); return; }
    if (isTransitioning || isInCooldown()) { cancelIntentImmediate(); return; }

    const now = Date.now();
    const elapsed = now - intentStartT;
    const p01 = Math.max(0, Math.min(1, elapsed / INTENT_HOLD_TO_CONFIRM_MS));

    showIntentUI(intentDir, p01);

    if (elapsed >= INTENT_HOLD_TO_CONFIRM_MS && elapsed >= INTENT_MIN_HOLD_MS) {
      const nextIdx = currentIndex + intentDir;
      cancelIntentImmediate();
      markCooldown();
      transitionTo(nextIdx);
      return;
    }

    intentRaf = requestAnimationFrame(tickIntent);
  }

  function startIntentIfNeeded(dir, source) {
    if (!ENABLE_INTENT_SCROLL_NAV) return;
    if (isTransitioning || isInCooldown()) { cancelIntentImmediate(); return; }
    if (!dir) return;

    const nextIdx = currentIndex + dir;
    if (nextIdx < 0 || nextIdx >= sections.length) {
      cancelIntentImmediate();
      return;
    }

    const now = Date.now();

    if (!intentActive) {
      intentActive = true;
      intentDir = dir;
      intentStartT = now;
      intentLastEventT = now;
      intentSource = source || '';

      showIntentUI(dir, 0);

      // IMPORTANT CHANGE:
      // - Wheel/trackpad: DO NOT arm keepalive cancel (mac hold emits no events).
      // - Touch: keepalive is ok.
      scheduleKeepAliveCancelTouchOnly();

      stopIntentTicker();
      intentRaf = requestAnimationFrame(tickIntent);
      return;
    }

    // Direction reversal cancels immediately
    if (intentDir !== dir) {
      cancelIntentImmediate();
      return;
    }

    // Keep-alive ping (touch only uses it for cancel safety)
    intentLastEventT = now;
    if (intentSource !== source && source) intentSource = source;
    scheduleKeepAliveCancelTouchOnly();
  }

  /* ============================================================
     TRANSITIONS
  ============================================================ */

  function transitionTo(index) {
    if (isTransitioning || index === currentIndex) return;
    if (index < 0 || index >= sections.length) return;

    cancelIntentImmediate();
    isTransitioning = true;

    const fromId = sections[currentIndex].id;
    const toId = sections[index].id;

    if (fromId === 'creative' && toId !== 'creative') {
      window.Site?.clearFrameBackground?.({ immediate: true, clearImage: false });
    }

    if (transitionLabel) {
      transitionLabel.textContent = SECTION_PATH[toId] || toId;
      transitionLabel.style.opacity = '0';
    }

    sections[currentIndex].classList.remove('is-active');

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

      if (transitionLabel) transitionLabel.style.opacity = '0';
      mask.style.opacity = '0';

      setTimeout(() => {
        isTransitioning = false;
      }, TRANSITION_DURATION);

    }, TRANSITION_DURATION);
  }

  /* ============================================================
     SCROLL CONTAINER RESOLUTION
  ============================================================ */

  function getScrollableParent(el, boundaryEl) {
    let node = el;
    while (node && node !== document.body && node !== boundaryEl) {
      if (node instanceof HTMLElement) {
        const style = window.getComputedStyle(node);
        const overflowY = style.overflowY;
        const canScrollY =
          (overflowY === 'auto' || overflowY === 'scroll') &&
          node.scrollHeight > node.clientHeight + 2;
        if (canScrollY) return node;
      }
      node = node.parentElement;
    }
    return null;
  }

  function resolveScrollContainerFromEventTarget(target) {
    const activeSection = sections[currentIndex];
    if (!activeSection) return null;

    const el = target instanceof Element ? target : null;
    if (!el) return activeSection;

    return getScrollableParent(el, activeSection) || activeSection;
  }

  function canScrollInDirection(container, dir) {
    if (!container || !(container instanceof HTMLElement)) return false;
    const max = container.scrollHeight - container.clientHeight;
    if (max <= 1) return false;
    const st = container.scrollTop;
    if (dir === 1) return st < max - 1;
    if (dir === -1) return st > 1;
    return false;
  }

  function atBoundary(container, dir) {
    if (!container || !(container instanceof HTMLElement)) return true;
    const max = container.scrollHeight - container.clientHeight;
    if (max <= 1) return true;
    const st = container.scrollTop;
    if (dir === 1) return st >= max - 1;
    if (dir === -1) return st <= 1;
    return true;
  }

  /* ============================================================
     WHEEL HANDLING (native scroll first; hold-to-confirm at edges)
  ============================================================ */

  function onWheel(e) {
    if (!ENABLE_INTENT_SCROLL_NAV) return;
    if (isTransitioning || isInCooldown()) { cancelIntentImmediate(); return; }

    const dy = e.deltaY || 0;
    const abs = Math.abs(dy);
    if (abs < INTENT_MIN_ACTIVITY_DELTA) return;

    const dir = dy > 0 ? 1 : -1;
    const container = resolveScrollContainerFromEventTarget(e.target);

    if (canScrollInDirection(container, dir)) {
      if (intentActive) cancelIntentImmediate();
      return;
    }

    if (!atBoundary(container, dir)) {
      if (intentActive) cancelIntentImmediate();
      return;
    }

    if (e.cancelable) e.preventDefault();
    startIntentIfNeeded(dir, 'wheel');
  }

  /* ============================================================
     TOUCH (swipe + boundary hold intent; respects scrollables)
  ============================================================ */

  const SWIPE_MIN_DISTANCE_PX = 80;
  const SWIPE_MAX_TIME_MS = 700;
  const SWIPE_LOCK_AXIS_PX = 12;

  let touchStartY = 0;
  let touchStartX = 0;
  let touchStartT = 0;
  let touchActive = false;
  let swipeConsumed = false;
  let touchLastY = 0;

  function onTouchStart(e) {
    if (isTransitioning) return;
    if (!e.touches || e.touches.length !== 1) return;

    touchActive = true;
    swipeConsumed = false;

    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
    touchStartT = Date.now();
    touchLastY = touchStartY;

    if (intentActive) cancelIntentImmediate();
  }

  function onTouchMove(e) {
    if (!touchActive || swipeConsumed) return;
    if (isTransitioning || isInCooldown()) { cancelIntentImmediate(); return; }
    if (!e.touches || e.touches.length !== 1) return;

    const y = e.touches[0].clientY;
    const x = e.touches[0].clientX;

    const dyTotal = touchStartY - y;
    const dxTotal = touchStartX - x;

    if (Math.abs(dyTotal) < SWIPE_LOCK_AXIS_PX) { touchLastY = y; return; }
    if (Math.abs(dxTotal) > Math.abs(dyTotal)) { touchLastY = y; return; }

    const direction = dyTotal > 0 ? 1 : -1;

    const container = resolveScrollContainerFromEventTarget(e.target);
    if (canScrollInDirection(container, direction)) {
      if (intentActive) cancelIntentImmediate();
      touchLastY = y;
      return;
    }

    if (ENABLE_INTENT_SCROLL_NAV) {
      const dyStep = touchLastY - y;
      const absStep = Math.abs(dyStep);
      const effortDir = dyStep > 0 ? 1 : -1;

      if (absStep >= INTENT_MIN_ACTIVITY_DELTA) {
        if (effortDir !== direction) {
          if (intentActive) cancelIntentImmediate();
        } else {
          if (e.cancelable) e.preventDefault();
          startIntentIfNeeded(direction, 'touch');
        }
      }
    }

    if (ENABLE_SWIPE_SECTION_NAV) {
      const dt = Date.now() - touchStartT;
      if (dt <= SWIPE_MAX_TIME_MS && Math.abs(dyTotal) >= SWIPE_MIN_DISTANCE_PX) {
        if (e.cancelable) e.preventDefault();
        swipeConsumed = true;
        cancelIntentImmediate();
        markCooldown();
        transitionTo(currentIndex + direction);
      }
    }

    touchLastY = y;
  }

  function onTouchEnd() {
    touchActive = false;
    swipeConsumed = false;
    if (intentActive) cancelIntentImmediate();
  }

  /* ============================================================
     KEYBOARD SHORTCUTS (optional)
  ============================================================ */

  function isTextInputLike(el) {
    if (!el) return false;
    const tag = (el.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    if (el.isContentEditable) return true;
    return false;
  }

  function onKeyDown(e) {
    if (!ENABLE_KEYBOARD_SECTION_NAV) return;
    if (isTransitioning) return;

    const a = document.activeElement;
    if (isTextInputLike(a)) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      transitionTo(currentIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      transitionTo(currentIndex - 1);
    }
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

      @media (hover: hover) and (pointer: fine) {
        .sectionNavBtn:hover { transform: scale(1.05); }
      }

      .sectionNavBtn:active { transform: scale(0.98); }

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

    const frameEl = document.getElementById('frame');
    if (!frameEl) return null;

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

    let btnToggle = null;
    if (ENABLE_SECTION_NAV_BUTTONS && ENABLE_AMBIENT_TOGGLE_BUTTON && ENABLE_AMBIENT_BG) {
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

    frameEl.appendChild(wrap);

    return { wrap, btnUp, btnToggle, btnDown };
  }

  const sectionNav = ENABLE_SECTION_NAV_BUTTONS ? createSectionNav() : null;

  function updateSectionNav() {
    if (!sectionNav || !sectionNav.wrap) return;

    const wrap = sectionNav.wrap;
    const btnUp = sectionNav.btnUp;
    const btnDown = sectionNav.btnDown;
    const btnToggle = sectionNav.btnToggle;

    const activeId = sections[currentIndex]?.id;
    const isFirst = currentIndex <= 0;
    const isLast = currentIndex >= sections.length - 1;

    if (btnToggle) {
      const hideToggle = HIDE_AMBIENT_TOGGLE_ON_SECTIONS.has(activeId);
      btnToggle.style.display = hideToggle ? 'none' : '';
      btnToggle.setAttribute('aria-pressed', String(AMBIENT_ENABLED));
      btnToggle.textContent = getAmbientToggleLabel();
    }

    btnUp.style.display = isFirst ? 'none' : '';
    btnDown.style.display = isLast ? 'none' : '';
    btnUp.disabled = isFirst;
    btnDown.disabled = isLast;

    if (wrap) wrap.style.justifyContent = 'center';
    if (!isLast) btnDown.textContent = NAV_DOWN_LABEL;
  }

  /* ============================================================
     INIT
  ============================================================ */

  setActiveSection(currentIndex);
  const initialId = sections[currentIndex].id;
  emitSectionChange(initialId);

  if (initialId === 'creative') {
    window.Site.setFrameBackground?.(CREATIVE_DEFAULT_BG, { fadeMs: 0 });
  }

  if (AMBIENT_ENABLED) {
    window.Site.setAmbientEnabled(true);
  } else {
    window.Site.clearAmbientBackgroundToWhite();
  }

  applyAmbientVisibility(initialId);

  window.Site.goTo = (sectionId) => {
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (idx !== -1) transitionTo(idx);
  };

  window.Site.getActiveSectionId = () => sections[currentIndex]?.id ?? null;

  if (ENABLE_INTENT_SCROLL_NAV) {
    window.addEventListener('wheel', onWheel, { passive: false });
  }

  const viewport = document.getElementById('viewport') || window;
  if (viewport && viewport.addEventListener) {
    viewport.addEventListener('touchstart', onTouchStart, { passive: true });
    viewport.addEventListener('touchmove', onTouchMove, { passive: false });
    viewport.addEventListener('touchend', onTouchEnd, { passive: true });
    viewport.addEventListener('touchcancel', onTouchEnd, { passive: true });
  }

  if (ENABLE_KEYBOARD_SECTION_NAV) {
    window.addEventListener('keydown', onKeyDown, { passive: false });
  }

  if (ENABLE_SECTION_NAV_BUTTONS) {
    updateSectionNav();
    window.addEventListener('site:sectionchange', updateSectionNav);
  }

  if (ENABLE_INTENT_SCROLL_NAV) {
    ensureUnderlayFrame();
    window.addEventListener('resize', () => {
      const u = document.getElementById('intent-underlay-frame');
      if (u) alignUnderlayToFrame(u);
    });
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
