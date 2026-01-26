(() => {
  const container = document.getElementById('projectsBox');
  if (!container) return;

  // Icon mapping (case-sensitive filenames)
  const ICONS = {
    report: 'assets/icons/Report.jpg',
    github: 'assets/icons/GitHub_Logo.png',
  };

  function esc(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function normalizeAuthors(authors) {
    if (Array.isArray(authors)) return authors.join(', ');
    return authors ? String(authors) : '';
  }

  function formatAuthors(authors) {
  const MY_NAME = 'Jan Zgraggen'; // change once here

  if (!authors) return '';

  const list = Array.isArray(authors) ? authors : authors.split(',');

  return list.map(name => {
    const trimmed = name.trim();
    const isMe = trimmed.toLowerCase() === MY_NAME.toLowerCase();

    return isMe
      ? `<strong class="author-me">${trimmed}</strong>`
      : `<span>${trimmed}</span>`;
  }).join(', ');
}


  function renderLinks(project) {
    const links = Array.isArray(project.links) ? project.links : [];
    if (!links.length) return '';

    const html = links.map((link) => {
      const label = esc(link.label || 'Link');
      const url = link.url || '#';
      const iconKey = (link.icon || '').toLowerCase();
      const iconSrc = ICONS[iconKey];

      // If an icon is unknown, skip it (keeps layout clean).
      if (!iconSrc) {
        console.warn('[projects] unknown icon key:', iconKey, 'for', project.id);
        return '';
      }

      return `
        <a
          class="projectLinkBtn"
          href="${esc(url)}"
          target="_blank"
          rel="noopener"
          aria-label="${label} — ${esc(project.title)}"
        >
          <img
            class="projectLinkIcon"
            src="${iconSrc}"
            alt=""
            loading="lazy"
            decoding="async"
            onerror="this.closest('.projectLinkBtn')?.remove()"
          />
        </a>
      `;
    }).join('');

    return `<div class="projectLinks">${html}</div>`;
  }

  function renderProject(project) {
    const title = esc(project.title || 'Untitled');
    const authors = esc(normalizeAuthors(project.authors));
    const venue = esc(project.venue || '');
    const description = esc(project.description || '');
    const type = project.type ? `<div class="projectTag">${esc(project.type)}</div>` : '';

    const imageSrc = project.image || '';
    const img = imageSrc
      ? `
        <div class="projectThumb" aria-hidden="true">
          <img
            src="${esc(imageSrc)}"
            alt="${title}"
            loading="lazy"
            decoding="async"
            onerror="this.closest('.projectThumb')?.classList.add('is-missing')"
          />
        </div>
      `
      : `<div class="projectThumb is-missing" aria-hidden="true"></div>`;

    return `
      <article class="projectCard" id="${esc(project.id || '')}">
        ${img}

        <div class="projectContent">
          <div class="projectTitle">${title}</div>
          ${authors ? `<div class="projectAuthors">${formatAuthors(project.authors)}</div>` : ''}
          ${venue ? `<div class="projectVenue">${venue}</div>` : ''}
          ${type}
          ${description ? `<div class="projectDescription">${description}</div>` : ''}
          ${renderLinks(project)}
        </div>
      </article>
    `;
  }

  async function loadProjects() {
    try {
      // If your other data files live under assets/data/, keep this consistent:
      const res = await fetch('assets/data/projects.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`projects.json HTTP ${res.status}`);

      const projects = await res.json();
      if (!Array.isArray(projects)) throw new Error('projects.json must be an array');

      container.innerHTML = projects.map(renderProject).join('');
    } catch (err) {
      console.error('[projects] load failed:', err);
      container.innerHTML = `
        <div class="projectsError">
          Projects unavailable.<br />
          <small>${esc(err.message)}</small>
        </div>
      `;
    }
  }

  loadProjects();
})();

