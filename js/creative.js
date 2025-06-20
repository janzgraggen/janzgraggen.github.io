document.addEventListener('DOMContentLoaded', function () {
    const scroller = document.querySelector('#creative .photo-scroller');
    const title = document.querySelector('#creative .creative-title');

    scroller.addEventListener('scroll', function () {
        const scrollLeft = scroller.scrollLeft;
        // If user scrolled even 1px, drop opacity to 0.1
        if (scrollLeft > 1) {
            title.style.opacity = 0.1;
        } else {
            title.style.opacity = 1;
        }
    });
});
