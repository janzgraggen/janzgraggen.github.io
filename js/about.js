document.addEventListener("DOMContentLoaded", function () {
    gsap.registerPlugin(MotionPathPlugin, ScrollTrigger);

    // Function to play the boat movement from the lower-left to the top-middle intersection
    function playBoatEntrance() {

        gsap.fromTo("#boat", 
            { 
                x: -600,  // Start from the left outside of the screen
                y: 270,   // Start slightly below the screen (adjust this based on layout)
                opacity: 1,
                rotation: 90 
            },
            { 
                opacity: 1,
                duration: 4,
                motionPath: {
                    path: [
                        { x: 150, y: -70 }, // Lowered the path (shifted y values down by 100)
                        { x: 190, y: -170 }, // Lowered y values by 100
                        { x: 150, y: -270 }, // Lowered y values by 100
                        { x: 230, y: -480 }  // Lowered y values by 100
                    ],
                    curviness: 1.2,  // Make the motion smoother
                    autoRotate: 100 // Keep top of the boat facing forward
                },
                ease: "power2.inOut"
            }
        );
    }

    // ScrollTrigger to play the animation when the section first enters the viewport
    ScrollTrigger.create({
        trigger: ".about-photo",  // The section that will trigger the animation
        start: "top 90%",  // When the section is near the viewport
        once: true,  // Ensures the animation only runs once
        onEnter: () => playBoatEntrance()  // Trigger the animation when the section enters
    });
});
