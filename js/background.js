const images = [
    '../assets/images/background1SW.jpeg',
    '../assets/images/background2SW.jpeg',
    '../assets/images/background3SW.jpeg',
    '../assets/images/background4SW.jpeg',
    // Add more images as needed
];

let currentIndex = 0;

function changeBackground() {
    const homeSection = document.getElementById('home');
    homeSection.style.backgroundImage = `url('${images[currentIndex]}')`;
    currentIndex = (currentIndex + 1) % images.length; // Loop back to the first image
}

// Change background every 5 seconds (5000 milliseconds)
setInterval(changeBackground, 2000);

// Set the initial background
changeBackground();
