//positional transition

window.addEventListener('scroll', function() {
    const navbar = document.getElementById('nav');
    const sections = document.querySelectorAll('section');
    const offsetTop = 120;
    const linkedinLogo = document.getElementById('linkedin-logo');
    const githubLogo = document.getElementById('github-logo');

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
        }
    });
});