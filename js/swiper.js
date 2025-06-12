const swiper = new Swiper('.swiper-container', {
  effect: 'coverflow',
  slidesPerView: 3,
  centeredSlides: true,
  loop: true,
  loopAdditionalSlides: 5,
  grabCursor: true,
  slideToClickedSlide: true,
  keyboard: {
    enabled: true,
  },
  mousewheel: {
    forceToAxis: true,   // allows only horizontal scroll to trigger
    invert: false,
    sensitivity: 1,
    releaseOnEdges: true
  },

  coverflowEffect: {
    rotate: 0,
    stretch: 0, // We'll control X offset manually via CSS
    depth: 150,
    modifier: 1,
    slideShadows: false
  },
  navigation: {
    nextEl: '.swiper-button-next',
    prevEl: '.swiper-button-prev',
  },
  pagination: {
    el: '.swiper-pagination',
    clickable: true,
  },

  on: {
    init() {
      addHoverSlideListeners();
      updateDotPosition(this.realIndex);
    },
    slideChange() {
      addHoverSlideListeners();
      setTimeout(() => {
        updateDotPosition(this.realIndex);
      }, 50); // tiny delay to ensure index updated
    }
  }
});

function addHoverSlideListeners() {
  document.querySelectorAll('.swiper-slide').forEach((slide) => {
    slide.removeEventListener('mouseenter', onHoverSlide);
    slide.addEventListener('mouseenter', onHoverSlide);
  });
}

function onHoverSlide(e) {
  const slide = e.currentTarget;
  if (slide.classList.contains('swiper-slide-prev')) {
    swiper.slidePrev();
  } else if (slide.classList.contains('swiper-slide-next')) {
    swiper.slideNext();
  }
}

const movingDot = document.getElementById('moving-dot');
const radius = 45;
const centerX = 50;
const centerY = 50;

// Get total unique slides, ignoring loop duplicates
const totalCards = document.querySelectorAll('.swiper-slide:not(.swiper-slide-duplicate)').length;

function updateDotPosition(index) {
  // Calculate angle, start from top (12 o'clock)
  const angle = (2 * Math.PI * index) / totalCards - Math.PI / 2;
  const x = centerX + radius * Math.cos(angle);
  const y = centerY + radius * Math.sin(angle);
  movingDot.setAttribute('cx', x);
  movingDot.setAttribute('cy', y);
}
