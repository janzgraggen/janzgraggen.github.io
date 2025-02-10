const images = [
    '../assets/images/background1SW.jpeg', // lowercase
    '../assets/images/background2SW.jpeg',
    '../assets/images/background3SW.jpeg',
    '../assets/images/background4SW.jpeg',
    // Add more images as needed
];


let currentIndex = 0;
let loadedImages = 0;

// Preload all background images
function preloadImages(images, callback) {
    let loadedCount = 0;
    
    images.forEach((imageSrc) => {
        const img = new Image();
        img.onload = () => {
            loadedCount++;
            if (loadedCount === images.length) {
                callback(); // Once all images are loaded, execute callback
            }
        };
        img.src = imageSrc; // Start loading the image
    });
}

// Function to change the background image
function changeBackground() {
    const homeSection = document.getElementById('home');
    homeSection.style.backgroundImage = `url('${images[currentIndex]}')`;
    currentIndex = (currentIndex + 1) % images.length; // Loop back to the first image
}

// Start background rotation after all images are preloaded
preloadImages(images, function() {
    // Start rotating backgrounds after preload
    setInterval(changeBackground, 2000); // Change background every 2 seconds
    changeBackground(); // Set the initial background
});