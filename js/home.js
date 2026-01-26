(() => {
  const FRAMES = [
    'assets/images/home/background1SW.jpeg',
    'assets/images/home/background2SW.jpeg',
    'assets/images/home/background3SW.jpeg',
    'assets/images/home/background4SW.jpeg',
  ];

  const INTERVAL_MS = 2200; // give breathing room vs fade
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

  function preload(frames) {
    return Promise.all(frames.map((src) => new Promise((resolve) => {
      const img = new Image();
      img.onload = async () => {
        if (img.decode) { try { await img.decode(); } catch {} }
        resolve(true);
      };
      img.onerror = () => resolve(false);
      img.src = src;
    })));
  }
async function setAndDecode(imgEl, src) {
  imgEl.src = src;
  if (imgEl.decode) {
    try { await imgEl.decode(); } catch {}
  }
}

async function crossfadeTo(nextSrc) {
  const incoming = showingA ? layerB : layerA;
  const outgoing = showingA ? layerA : layerB;

  // 1) Ensure outgoing is visible (never allow both hidden)
  outgoing.classList.add('is-visible');
  incoming.classList.remove('is-visible');

  // 2) Load + decode incoming fully before showing it
  await setAndDecode(incoming, nextSrc);

  // 3) Next frame: show incoming, hide outgoing (sum never “dips” visually)
  requestAnimationFrame(() => {
    incoming.classList.add('is-visible');
    outgoing.classList.remove('is-visible');
  });

  showingA = !showingA;
}


  function start() {
    if (timer || !preloaded || prefersReducedMotion.matches) return;
    timer = setInterval(async () => {
      idx = (idx + 1) % FRAMES.length;
      await crossfadeTo(FRAMES[idx], false);
    }, INTERVAL_MS);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  async function onSectionChange(sectionId) {
    if (sectionId !== 'home') {
      stop();
      return;
    }

    if (!preloaded) return;

    idx = 0;
    showingA = true;

    await crossfadeTo(FRAMES[0], true);

    if (!prefersReducedMotion.matches) start();
  }

  window.addEventListener('site:sectionchange', (e) => onSectionChange(e.detail.sectionId));

  prefersReducedMotion.addEventListener?.('change', () => {
    const active = document.querySelector('.section.is-active')?.id || 'home';
    onSectionChange(active);
  });

  (async function init() {
    // initial safe
    layerA.src = FRAMES[0];
    layerA.style.opacity = '1';
    layerB.style.opacity = '0';

    await preload(FRAMES);
    preloaded = true;

    const active = document.querySelector('.section.is-active')?.id || 'home';
    onSectionChange(active);
  })();
})();