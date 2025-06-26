// ==============================
// Dot Matrix Background with Cursor Proximity and Document-Level Drag Effect
// ==============================

let canvas, ctx;
let dots = [];
let offsetX = 0; // For background scrolling/shifting
let offsetY = 0; // For background scrolling/shifting
let mouseX = 0; // Current mouse X position (for proximity effect)
let mouseY = 0; // Current mouse Y position (for proximity effect)
let animationId; // Stores the ID returned by requestAnimationFrame for cancellation

let isDraggingBackground = false; // Flag to track if the background is currently being dragged
let lastMouseX = 0;               // Stores the last X position of the mouse during a drag
let lastMouseY = 0;               // Stores the last Y position of the mouse during a drag

/**
 * Initializes the background canvas and starts the animation.
 * Sets up event listeners for window resize, mouse movement, and drag.
 */
function initBackground() {
    canvas = document.getElementById('background-canvas');
    if (!canvas) {
        console.warn('Background canvas not found. Make sure an element with id="background-canvas" exists.');
        return;
    }

    ctx = canvas.getContext('2d');
    resizeCanvas(); // Set initial canvas size and generate dots

    // Event listeners for responsiveness and interactivity
    window.addEventListener('resize', resizeCanvas);
    document.addEventListener('mousemove', updateCursorPositionAndDrag); // Combined handler
    
    // === Modified Dragging Event Listeners: Now on document ===
    // This allows us to capture the mousedown even if something else is on top,
    // and then check if the target was our canvas.
    document.addEventListener('mousedown', startBackgroundDrag);
    document.addEventListener('mouseup', stopBackgroundDrag);
    document.addEventListener('mouseleave', stopBackgroundDrag); // In case mouse leaves window
    // ===================================

    // Start the animation loop
    animateDots();
}

/**
 * Resizes the canvas to fill the window and regenerates the dot grid.
 * Called on initialization and window resize events.
 */
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    generateDots(); // Regenerate dots when canvas resizes to fit new dimensions
}

/**
 * Generates a grid of dots that form the dot matrix background.
 * Dots are initialized with a base position and size.
 */
function generateDots() {
    dots = []; // Clear existing dots
    const spacing = 50; // Distance between dot centers
    // Calculate columns and rows, adding extra for seamless scrolling effect when offset
    const cols = Math.ceil(canvas.width / spacing) + 2;
    const rows = Math.ceil(canvas.height / spacing) + 2;

    // The base size for dots when not influenced by the cursor
    const initialBaseDotSize = 1.5;

    for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rows; row++) {
            // Initial position (baseX, baseY) is slightly off-screen to handle offsets gracefully
            const x = col * spacing - spacing;
            const y = row * spacing - spacing;
            dots.push({
                baseX: x, // Original X position without floating or offset
                baseY: y, // Original Y position without floating or offset
                x: x,     // Current X position (affected by floating)
                y: y,     // Current Y position (affected by floating)
                size: initialBaseDotSize, // Current rendered size of the dot
                targetSize: initialBaseDotSize // Desired size (influenced by mouse proximity)
            });
        }
    }
}

/**
 * Handles mouse movement for both proximity effect and background dragging.
 * @param {MouseEvent} e - The mouse event object.
 */
function updateCursorPositionAndDrag(e) {
    // Always update for proximity effect
    mouseX = e.clientX;
    mouseY = e.clientY;

    // Handle background dragging movement
    if (isDraggingBackground) {
        const deltaX = mouseX - lastMouseX;
        const deltaY = mouseY - lastMouseY;
        shiftBackground(deltaX, deltaY); // Move the entire background
        lastMouseX = mouseX; // Update last position for next frame
        lastMouseY = mouseY;
        // Prevent default text selection etc. during drag if it's the background we're dragging
        e.preventDefault();
    }
}

/**
 * Initiates the background dragging process ONLY if the click originated on the canvas.
 * @param {MouseEvent} e - The mouse event object.
 */
function startBackgroundDrag(e) {
    // Check if the actual element clicked was our background canvas
    if (e.target === canvas) {
        isDraggingBackground = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        // Important: Prevent default browser dragging behaviors for the background canvas
        e.preventDefault();
    }
}

/**
 * Stops the background dragging process.
 */
function stopBackgroundDrag() {
    isDraggingBackground = false;
}

/**
 * Calculates and updates the target size of each dot based on its proximity to the cursor.
 * Dots closer to the cursor will have a larger targetSize.
 */
function updateDotSizes() {
    const maxDistance = 150; // The maximum distance from the cursor for a dot to be affected
    const baseSize = 1;    // The default size of dots when not influenced by the cursor
    const maxScale = 3.5;    // Maximum multiplier for dot size when directly under the cursor

    dots.forEach(dot => {
        // Calculate the dot's current screen position, taking into account the background offset.
        const dotScreenX = dot.x + offsetX;
        const dotScreenY = dot.y + offsetY;

        // Calculate the distance between the current dot and the cursor
        const dx = dotScreenX - mouseX;
        const dy = dotScreenY - mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < maxDistance) {
            const influence = 1 - (distance / maxDistance);
            const scale = 1 + (influence * maxScale);
            dot.targetSize = baseSize * scale;
        } else {
            dot.targetSize = baseSize;
        }

        // Smoothly interpolate the current dot size towards its target size.
        dot.size += (dot.targetSize - dot.size) * 0.15;
    });
}

/**
 * Adds a subtle, continuous floating movement to each dot.
 */
function addSubtleFloating() {
    const time = Date.now() * 0.003; // Convert current time to seconds for animation
    const floatAmplitudeX = 0.55; // Max horizontal floating displacement
    const floatAmplitudeY = 0.55; // Max vertical floating displacement

    dots.forEach((dot, index) => {
        const floatX = Math.sin(time + index * 0.1) * floatAmplitudeX;
        const floatY = Math.cos(time + index * 0.15) * floatAmplitudeY;
        dot.x = dot.baseX + floatX;
        dot.y = dot.baseY + floatY;
    });
}

/**
 * The main animation loop. Clears the canvas, updates dot states (size, position),
 * draws the dots, and requests the next animation frame.
 */
function animateDots() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    addSubtleFloating();
    updateDotSizes();
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";

    dots.forEach(dot => {
        const screenX = dot.x + offsetX;
        const screenY = dot.y + offsetY;

        if (screenX > -10 && screenX < canvas.width + 10 &&
            screenY > -10 && screenY < canvas.height + 10) {
            ctx.beginPath();
            ctx.arc(screenX, screenY, dot.size, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    animationId = requestAnimationFrame(animateDots);
}

/**
 * Shifts the entire dot matrix background by the given delta values.
 */
function shiftBackground(deltaX, deltaY) {
    offsetX += deltaX;
    offsetY += deltaY;

    const spacing = 50;
    if (offsetX > spacing) offsetX -= spacing;
    if (offsetX < -spacing) offsetX += spacing;
    if (offsetY > spacing) offsetY -= spacing;
    if (offsetY < -spacing) offsetY += spacing;
}

/**
 * Cleans up event listeners and stops the animation loop.
 */
function cleanupBackground() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    window.removeEventListener('resize', resizeCanvas);
    document.removeEventListener('mousemove', updateCursorPositionAndDrag);
    document.removeEventListener('mousedown', startBackgroundDrag);
    document.removeEventListener('mouseup', stopBackgroundDrag);
    document.removeEventListener('mouseleave', stopBackgroundDrag);
}

// Automatically initialize the background when the window loads
window.addEventListener('load', initBackground);
