document.addEventListener("DOMContentLoaded", function () {
    const aboutPhoto = document.querySelector(".about-photo");

    // Slide away on page load (reveal text)
    setTimeout(() => {
        aboutPhoto.classList.add("show-text");
    }, 500); // Delay for effect

    // Slide back when leaving the page
    window.addEventListener("beforeunload", function () {
        aboutPhoto.classList.remove("show-text");
        aboutPhoto.classList.add("hide-text");
    });
});
