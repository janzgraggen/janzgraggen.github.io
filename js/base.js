(() => {
  const sections = Array.from(document.querySelectorAll('.section'));
  const mask = document.getElementById('transition-mask');

  let currentIndex = 0;
  let isTransitioning = false;

  const TRANSITION_DURATION = 600;

  function setActiveSection(index) {
    sections.forEach((section, i) => {
      section.classList.toggle('is-active', i === index);
    });
  }

  function transitionTo(index) {
    if (isTransitioning || index === currentIndex) return;
    if (index < 0 || index >= sections.length) return;

    isTransitioning = true;

    // Fade out current section
    sections[currentIndex].classList.remove('is-active');

    // Fade to black
    mask.style.opacity = '1';

    setTimeout(() => {
      currentIndex = index;
      setActiveSection(currentIndex);

      // Fade back in
      mask.style.opacity = '0';

      setTimeout(() => {
        isTransitioning = false;
      }, TRANSITION_DURATION);
    }, TRANSITION_DURATION);
  }

  function onWheel(e) {
    if (isTransitioning) return;

    const delta = e.deltaY;

    if (delta > 40) {
      transitionTo(currentIndex + 1);
    } else if (delta < -40) {
      transitionTo(currentIndex - 1);
    }
  }

  // Initial state
  setActiveSection(currentIndex);
  // Public hook for navigation (permitted integration point).
  // Does not change transition behavior; only exposes access to it.
  window.Site = window.Site || {};
  window.Site.goTo = (sectionId) => {
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (idx !== -1) transitionTo(idx);
  };
  window.Site.getActiveSectionId = () => sections[currentIndex]?.id ?? null;


  window.addEventListener('wheel', onWheel, { passive: true });
})();


