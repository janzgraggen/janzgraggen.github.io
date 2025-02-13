document.addEventListener("DOMContentLoaded", function () {
    const btn = document.getElementById("btn");
    const dropdown = document.getElementById("dropdown");
    const dropnav = document.getElementById("drop-nav");
    const navLinks = document.querySelectorAll(".drop-nav li a");
    const linkedinLogo = document.getElementById('linkedin-logo');
    const githubLogo = document.getElementById('github-logo');

    function toggleDropdown(event) {
        event.stopPropagation(); // Prevent click from bubbling up
        dropdown.classList.toggle("show");
        if (dropdown.classList.contains("show")) {
            linkedinLogo.src = 'assets/icons/LI-In-Bug-white.png'; // Alternate LinkedIn logo
            githubLogo.src = 'assets/icons/github-mark-white.png'; // Alternate GitHub logo
        } else {
            closeDropdown();
        }
    }

    function closeDropdown() {
        linkedinLogo.src = 'assets/icons/LI-In-Bug.png'; // Original LinkedIn logo
        githubLogo.src = 'assets/icons/github-mark.png'; // Original GitHub logo
        dropdown.classList.remove("show");
    }

    btn.addEventListener("click", toggleDropdown);

    navLinks.forEach(link => {
        link.addEventListener("click", closeDropdown);
    });

    document.addEventListener("click", function (event) {
        if (!dropdown.contains(event.target) && !btn.contains(event.target)) {
            closeDropdown();
        }
    });

    window.addEventListener("resize", function () {
        if (window.innerWidth > 920) {
            closeDropdown();
        }
    });
});

