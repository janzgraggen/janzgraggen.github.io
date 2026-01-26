(() => {
  const btn35 = document.getElementById('btnRandom35');
  const btnSketch = document.getElementById('btnRandomSketch');
  if (!btn35 || !btnSketch) return;

  const MANIFEST = {
    p: 'assets/images/creative/p/manifest.json',
    i: 'assets/images/creative/i/manifest.json',
  };

  const DIR = {
    p: 'assets/images/creative/p/',
    i: 'assets/images/creative/i/',
  };

  const cache = { p: null, i: null };
  const lastPicked = { p: null, i: null };

  async function loadManifest(kind) {
    if (cache[kind]) return cache[kind];

    const res = await fetch(MANIFEST[kind], { cache: 'no-store' });
    if (!res.ok) throw new Error(`Manifest HTTP ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data) || data.some((x) => typeof x !== 'string')) {
      throw new Error('Invalid manifest schema (expected string[])');
    }

    cache[kind] = data;
    return data;
  }

  function pickRandom(files, last) {
    if (!files.length) return null;
    if (files.length === 1) return files[0];

    let pick = null;
    for (let tries = 0; tries < 6; tries++) {
      pick = files[Math.floor(Math.random() * files.length)];
      if (pick !== last) break;
    }
    return pick;
  }

  async function preloadAndDecode(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        if (img.decode) { try { await img.decode(); } catch {} }
        resolve(true);
      };
      img.onerror = () => reject(new Error('Image failed to load'));
      img.src = url;
    });
  }

  async function setRandom(kind) {
    if (!window.Site?.setFrameBackground) {
      console.warn('[creative] setFrameBackground not available');
      return;
    }

    let files;
    try {
      files = await loadManifest(kind);
    } catch (e) {
      console.warn('[creative] manifest load failed:', e);
      return;
    }

    if (!files.length) return;

    const MAX_RETRIES = Math.min(5, files.length);
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const pick = pickRandom(files, lastPicked[kind]);
      if (!pick) break;

      const url = `${DIR[kind]}${pick}`;

      try {
        await preloadAndDecode(url);
        lastPicked[kind] = pick;
        await window.Site.setFrameBackground(url, { fadeMs: 320 });
        return;
      } catch (e) {
        console.warn('[creative] image load failed, retrying:', url, e);
      }
    }
  }

  btn35.addEventListener('click', () => setRandom('p'));
  btnSketch.addEventListener('click', () => setRandom('i'));
})();
