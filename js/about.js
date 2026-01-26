(() => {
  const DATA_URL = 'assets/data/about.json';

  const mount = document.getElementById('aboutMount');
  const box = document.getElementById('aboutBox');

  if (!mount || !box) return;

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function isValidPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (!Array.isArray(payload.sections)) return false;

  return payload.sections.every((s) => {
    if (!s || typeof s.title !== 'string' || !Array.isArray(s.items)) return false;

    return s.items.every((it) => {
      if (!it || typeof it !== 'object') return false;
      if (typeof it.title !== 'string') return false;
      if (typeof it.content !== 'string') return false;
      if (it.image != null && typeof it.image !== 'string') return false;
      return true;
    });
  });
}


 function render(payload) {
  const html = payload.sections.map((section) => {
    const sectionTitle = escapeHtml(section.title);

    const items = section.items.map((it) => {
      const title = escapeHtml(it.title);
      const content = escapeHtml(it.content);
      const imageSrc = (it.image || '').trim();

      const media = imageSrc
        ? `<img class="aboutItemMedia" src="${escapeHtml(imageSrc)}" alt="" loading="lazy" decoding="async">`
        : `<div class="aboutItemMedia aboutItemMedia--empty" aria-hidden="true"></div>`;

      return `
        <li class="aboutItem">
          <div class="aboutItemText">
            <div class="aboutItemTitle">${title}</div>
            <div class="aboutItemContent">${content}</div>
          </div>
          ${media}
        </li>
      `;
    }).join('');

    return `
      <section class="aboutBlock" aria-label="${sectionTitle}">
        <h2 class="aboutTitle">${sectionTitle}</h2>
        <ul class="aboutList">
          ${items}
        </ul>
      </section>
    `;
  }).join('');

  mount.innerHTML = html;
  box.scrollTop = 0;
}


  function renderFallback(message) {
    mount.innerHTML = `
      <section class="aboutBlock" aria-label="About">
        <h2 class="aboutTitle">About</h2>
        <ul class="aboutList">
          <li class="aboutItem">${escapeHtml(message)}</li>
        </ul>
      </section>
    `;
  }

  async function load() {
    try {
      const res = await fetch(DATA_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const payload = await res.json();
      if (!isValidPayload(payload)) throw new Error('Invalid JSON schema');

      render(payload);
    } catch (err) {
      renderFallback('Unable to load About data.');
      // Optional: keep a console breadcrumb for debugging
      console.warn('[about] failed to load JSON:', err);
    }
  }

  // Load once on startup
  load();
})();
