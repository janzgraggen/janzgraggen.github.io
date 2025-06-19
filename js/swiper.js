
const totalSlides = 4;

const swiper = new Swiper('.swiper', {
  direction: 'horizontal',
  slidesPerView: 3,
  centeredSlides: true,
  loop: true,
  loopAdditionalSlides: totalSlides *2 ,
  spaceBetween: 50, // no gap between slides
  watchSlidesProgress: true,
  watchSlidesVisibility: true,
  effect: 'coverflow',
  coverflowEffect: {
    rotate: 0,
    depth: 160,
    scale: 0.9,
    modifier: 1,
    slideShadows: false
  },
  mousewheel: {
    forceToAxis: true,
    sensitivity: 1
  },
  pagination: {
    el: '.swiper-pagination',
    clickable: true
  },
  navigation: {
    nextEl: '.swiper-button-next',
    prevEl: '.swiper-button-prev'
  },
  on: {
    init() {
      updateDotPosition(this.realIndex);
    },
    slideChange() {
      updateDotPosition(this.realIndex);
    }
  }
});

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
