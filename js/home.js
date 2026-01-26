(() => {
  const FRAMES = [
    'assets/images/home/background1SW.jpeg',
    'assets/images/home/background2SW.jpeg',
    'assets/images/home/background3SW.jpeg',
    'assets/images/home/background4SW.jpeg',
  ];

  const INTERVAL_MS = 2200;
  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const home = document.getElementById('home');
  if (!home) return;

  const layerA = home.querySelector('.home-bg__layer--a');
  const layerB = home.querySelector('.home-bg__layer--b');
  if (!layerA || !layerB) return;

  let timer = null;
  let idx = 0;
  let showingA = true;
  let preloaded = false;
  let lastSectionId = null;

  function preload(frames) {
    return Promise.all(
      frames.map(
        (src) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = async () => {
              if (img.decode) {
                try {
                  await img.decode();
                } catch {}
              }
              resolve(true);
            };
            img.onerror = () => resolve(false);
            img.src = src;
          })
      )
    );
  }

  async function setAndDecode(imgEl, src) {
    // Avoid re-setting the same src (can cause needless decode work)
    if (imgEl.src && imgEl.src.endsWith(src)) return;
    imgEl.src = src;
    if (imgEl.decode) {
      try {
        await imgEl.decode();
      } catch {}
    }
  }

  async function crossfadeTo(nextSrc) {
    const incoming = showingA ? layerB : layerA;
    const outgoing = showingA ? layerA : layerB;

    // Ensure at least one is visible at all times
    outgoing.classList.add('is-visible');
    incoming.classList.remove('is-visible');

    // Load incoming fully before showing
    await setAndDecode(incoming, nextSrc);

    // Next frame: swap visibility
    requestAnimationFrame(() => {
      incoming.classList.add('is-visible');
      outgoing.classList.remove('is-visible');
    });

    showingA = !showingA;
  }

  function start() {
    if (timer || !preloaded || prefersReducedMotion.matches) return;

    timer = setInterval(() => {
      idx = (idx + 1) % FRAMES.length;
      // fire-and-forget; interval continues regardless of async
      crossfadeTo(FRAMES[idx]);
    }, INTERVAL_MS);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  async function ensureHomeRunning() {
    if (!preloaded) return;

    // Only reset when we ENTER home (prevents repeatedly snapping back to frame 0)
    if (lastSectionId !== 'home') {
      idx = 0;
      showingA = true;
      await crossfadeTo(FRAMES[0]);
    }

    lastSectionId = 'home';

    if (prefersReducedMotion.matches) {
      stop();
    } else {
      start();
    }
  }

  async function onSectionChange(sectionId) {
    if (sectionId !== 'home') {
      stop();
      lastSectionId = sectionId;
      return;
    }
    await ensureHomeRunning();
  }

  window.addEventListener('site:sectionchange', (e) => {
    onSectionChange(e.detail.sectionId);
  });

  prefersReducedMotion.addEventListener?.('change', () => {
    const active = document.querySelector('.section.is-active')?.id || 'home';
    onSectionChange(active);
  });

  (async function init() {
    // Initial safe state (show A, hide B)
    layerA.src = FRAMES[0];
    layerA.classList.add('is-visible');
    layerB.classList.remove('is-visible');

    await preload(FRAMES);
    preloaded = true;

    const active = document.querySelector('.section.is-active')?.id || 'home';
    await onSectionChange(active);
  })();
})();
