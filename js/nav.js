//––––––––––––––– positional transition of navbar and logos
function updateNavbarAndLogos() {
    const navbar = document.getElementById('nav');
    const sections = document.querySelectorAll('section');
    const offsetTop = 120;
    const linkedinLogo = document.getElementById('linkedin-logo');
    const githubLogo = document.getElementById('github-logo');
    const homePhrase = document.getElementById("homephrase");

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;

        if (window.scrollY >= sectionTop - offsetTop && window.scrollY < sectionTop + sectionHeight - offsetTop) {
            navbar.className = ''; // Clear existing classes
            navbar.classList.add('nav-' + section.id); // Add new class based on section ID
            // Change image sources based on the active section
            if ((section.id === 'home') || (section.id === 'projects')|| (section.id === 'creativity')) {
                // Default images for section home
                linkedinLogo.src = 'assets/icons/LI-In-Bug.png'; // Default LinkedIn logo
                githubLogo.src = 'assets/icons/github-mark.png'; // Default GitHub logo
            } else if (section.id === 'about') {
                // Alternate images for section about
                linkedinLogo.src = 'assets/icons/LI-In-Bug-white.png'; // Alternate LinkedIn logo
                githubLogo.src = 'assets/icons/github-mark-white.png'; // Alternate GitHub logo
            }
            if (section.id === 'home' && window.innerWidth > 920) {
                homePhrase.classList.add("show");
                homePhrase.style.transition = "opacity 3s ease-in-out";
                homePhrase.style.opacity = 1;
            } else {
                homePhrase.classList.remove("show");
                homePhrase.style.transition = "opacity 0s ease-in-out";
                homePhrase.style.opacity = 0;
            }
        }
    });
}
window.addEventListener('scroll', updateNavbarAndLogos);
window.addEventListener('load', updateNavbarAndLogos);
window.addEventListener('resize', updateNavbarAndLogos);
//––––––––––––––– positional transition of navbar and logos END

//––––––––––––––– CIRCLE 
const sectionConfig = {
    "home": { color: "black", top: "108px"},
    "about": { color: "white", top: "144px" },
    "projects": { color: "black", top: "164px" },
    "creative": { color: "black", top: "183px"}
};

function updateCircle(sectionId) {
    const circle = document.getElementById("circle");

    if (sectionConfig[sectionId]) {
        circle.style.backgroundColor = sectionConfig[sectionId].color;
        circle.style.top = sectionConfig[sectionId].top;
        circle.style.left = sectionConfig[sectionId].left;
    }
}

function onScroll() {
    const sections = Object.keys(sectionConfig);
    let currentSection = sections[0]; // Default to first section

    for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
            const rect = element.getBoundingClientRect();

            // Adjust this value to control how early the change happens
            const threshold = window.innerHeight * 0.16; 

            if (rect.top < threshold && rect.bottom > threshold) {
                currentSection = section;
            }
        }
    }

    updateCircle(currentSection);
    history.replaceState(null, null, `#${currentSection}`);
}

// Run when the page loads and when scrolling
window.addEventListener("scroll", onScroll);
window.addEventListener("load", onScroll);

//––––––––––––––– CIRCLE END ––


//––––––––––––––– MOBILE –––––––––––––––––––––––––––––––––

document.addEventListener("DOMContentLoaded", function () {
    const btn = document.getElementById("btn");
    const dropdown = document.getElementById("dropdown");
    const navLinks = document.querySelectorAll("#dropdown ul li a");
    const linkedinLogo = document.getElementById('linkedin-logo');
    const githubLogo = document.getElementById('github-logo');

    function toggleDropdown(event) {
        event.stopPropagation();
        dropdown.classList.toggle("show");
        if (dropdown.classList.contains("show")) {
            linkedinLogo.src = 'assets/icons/LI-In-Bug-white.png';
            githubLogo.src = 'assets/icons/github-mark-white.png';
        } else {
            closeDropdown();
        }
    }

    function closeDropdown() {
        linkedinLogo.src = 'assets/icons/LI-In-Bug.png';
        githubLogo.src = 'assets/icons/github-mark.png';
        dropdown.classList.remove("show");
    }

    btn.addEventListener("click", toggleDropdown);

    // Close dropdown when clicking a link
    navLinks.forEach(link => {
        link.addEventListener("click", function () {
            closeDropdown();
        });
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

