function positionPaginationBulletsCircular() {
  const pagination = document.querySelector('.swiper-pagination');
  if (!pagination) return;

  const bullets = pagination.querySelectorAll('.swiper-pagination-bullet');
  if (bullets.length === 0) return;

  const radius = 20; // circle radius in px
  const centerX = radius;
  const centerY = radius;
  const total = bullets.length;

  bullets.forEach((bullet, index) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2; // start from top
    const x = centerX + radius * Math.cos(angle) - bullet.offsetWidth / 2;
    const y = centerY + radius * Math.sin(angle) - bullet.offsetHeight / 2;

    bullet.style.left = `${x}px`;
    bullet.style.top = `${y}px`;
  });
}


const swiper = new Swiper('.swiper', {
  direction: 'horizontal',
  slidesPerView: 3,
  centeredSlides: false,
  initialSlide: 3,
  loop: true,
  loopAdditionalSlides: 10,
  spaceBetween: 10, // initial default, will be updated dynamically
  watchSlidesProgress: true,
  watchSlidesVisibility: true,
  effect: 'coverflow',
  coverflowEffect: {
    rotate: 0,
    depth: 160,
    scale: 0.9,
    modifier: 1,
    slideShadows: false,
  },
  mousewheel: {
    forceToAxis: true,
    sensitivity: 1,
  },
  pagination: {
    el: '.swiper-pagination',
    clickable: true,
  },
  navigation: {
    nextEl: '.swiper-button-next',
    prevEl: '.swiper-button-prev',
  },
  observer: true,
  observeParents: true,
  breakpoints: {
    // When window width is <= 920px (or your preferred size)
    920: {
      centeredSlides: true,
      slidesPerView: 3,
    },

    0: {
      centeredSlides: true,
      slidesPerView: 1,
      //mousewheel: false, // Disable mousewheel on small screens
    }
  },

    on: {
    init() {
      updateInteractivity(this);
      updateSpaceBetween(this);
      setTimeout(() => positionPaginationBulletsCircular(), 50); // position bullets after init
    },
    slideChange() {
      updateInteractivity(this);
      setTimeout(() => positionPaginationBulletsCircular(), 50); // reposition bullets if needed
    },
    paginationUpdate() {
      setTimeout(() => positionPaginationBulletsCircular(), 50); // reposition bullets on pagination update
    },
  },
});
const defaultSpace = 10; // Default space between slides
// Show only active + immediate neighbors; hide all others with smooth shrink transition
function updateInteractivity(swiperInstance) {
  swiperInstance.slides.forEach((slide, idx) => {
    // Always hide by default
    slide.style.pointerEvents = 'none';
    slide.style.zIndex = '1';
    slide.style.opacity = '0';
    slide.style.transform = 'scale(0)';
    slide.style.filter = 'none';
    slide.style.marginTop = '0';
    slide.style.transition = 'opacity 0.5s ease, transform 0.5s ease, filter 0.5s ease, margin-top 0.5s ease';
  });

  // Get active index normalized (Swiper loop duplicates)
  const activeIndex = swiperInstance.realIndex;
  const totalSlides = swiperInstance.slides.length / (swiperInstance.loop ? 3 : 1); // approx count excluding duplicates

  // Define visible indices: active, prev, next (loop around)
  const prevIndex = (activeIndex - 1 + totalSlides) % totalSlides;
  const nextIndex = (activeIndex + 1) % totalSlides;

  swiperInstance.slides.forEach((slide) => {
    // Get slide real index
    const slideRealIndex = slide.getAttribute('data-swiper-slide-index');
    if (slideRealIndex === null) return; // skip if no data

    const slideIdx = parseInt(slideRealIndex, 10);

    if (slideIdx === activeIndex) {
      // Active slide
      slide.style.pointerEvents = 'auto';
      slide.style.zIndex = '10';
      slide.style.opacity = '1';
      slide.style.transform = 'scale(1)';
      slide.style.filter = 'none';
      slide.style.marginTop = '0';
    } else if (slideIdx === prevIndex || slideIdx === nextIndex) {
      // Immediate neighbors
      slide.style.pointerEvents = 'none';
      slide.style.zIndex = '5';
      slide.style.opacity = '0.01';
      slide.style.transform = 'scale(0.85)';
      slide.style.filter = 'blur(4px)';
      slide.style.marginTop = '-50px';
    } else {
      // All others: hidden smoothly
      slide.style.opacity = '0';
      slide.style.transform = 'scale(0)';
      slide.style.pointerEvents = 'none';
      slide.style.zIndex = '0';
      slide.style.filter = 'none';
      slide.style.marginTop = '0';
    }
  });
}

// Dynamically update spacing between slides based on viewport width
function updateSpaceBetween(swiperInstance) {
  const vw = window.innerWidth;
  // Space between slides is 5% of viewport width, clamped between 20 and 50px
  const space = Math.min(Math.max(vw * 0.05, 20), defaultSpace );
  swiperInstance.params.spaceBetween = space;
  swiperInstance.update();
}

// Update spaceBetween on window resize
window.addEventListener('resize', () => updateSpaceBetween(swiper));

function updateDotPosition(activeIndex) {
  const dots = document.querySelectorAll('.swiper-pagination-bullet');
  dots.forEach((dot, index) => {
    if (index === activeIndex) {
      dot.style.transform = 'scale(1.2)';
      dot.style.opacity = '1';
    } else {
      dot.style.transform = 'scale(1)';
      dot.style.opacity = '0.5';
    }
  });
}


let debounceTimeout;
swiper.on('slideChange', () => {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    updateInteractivity(swiper);
  }, 50); // 50ms delay
});


