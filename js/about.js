document.addEventListener("DOMContentLoaded", function () {
    gsap.registerPlugin(MotionPathPlugin, ScrollTrigger);

    // Function to play the boat movement from the lower-left to the top-middle intersection
    function playBoatEntrance() {

        gsap.fromTo("#boat", 
            { 
                x: -660,  // Start from the left outside of the screen
                y: 270,   // Start slightly below the screen (adjust this based on layout)
                opacity: 1,
                visibility: 'hidden', // Ensure it's not visible initially
                rotation: 90 
            },
            { 
                opacity: 1,
                visibility: 'visible', // Make it visible once animation starts
                duration: 5,
                motionPath: {
                    path: [
                        { x: 150, y: -70 }, // Lowered the path (shifted y values down by 100)
                        { x: 190, y: -170 }, // Lowered y values by 100
                        { x: 150, y: -270 }, // Lowered y values by 100
                        { x: 330, y: -580 }  // Lowered y values by 100
                    ],
                    curviness: 1.2,  // Make the motion smoother
                    autoRotate: 100 // Keep top of the boat facing forward
                },
                ease: "power2.inOut"
            }
        );
    }

    function fadeInAboutContent() {
        gsap.fromTo(".about-content", 
            { 
                opacity: 0,
                x: 0 // Start slightly to the left
            }, 
            { 
                opacity: 1,
                x: 0, // Move to the original position
                duration: 3,
                delay: 2.5 // Add a delay of 2 seconds before starting the animation
            }
        );
    }

    // Check if the user came from the "CV/cv.html" page and prevent triggering the animations
    if (document.referrer !== 'https://janzgraggen.github.io/CV/cv.html') {

        // ScrollTrigger to play the fade-in animation when the section first enters the viewport
        ScrollTrigger.create({
            trigger: ".about-content",  // The section that will trigger the animation
            start: "top 90%",  // When the section is near the viewport
            once: true,  // Ensures the animation only runs once
            onEnter: () => fadeInAboutContent()  // Trigger the animation when the section enters
        });

        // ScrollTrigger to play the animation when the section first enters the viewport
        ScrollTrigger.create({
            trigger: ".about-photo",  // The section that will trigger the animation
            start: "top 90%",  // When the section is near the viewport
            once: true,  // Ensures the animation only runs once
            onEnter: () => playBoatEntrance()  // Trigger the animation when the section enters
        });

    }
});
