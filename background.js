// ==============================
// Dot Matrix Background with Cursor Proximity Effect
// ==============================

let canvas, ctx;
let dots = [];
let offsetX = 0; // For background scrolling/shifting
let offsetY = 0; // For background scrolling/shifting
let mouseX = 0; // Current mouse X position
let mouseY = 0; // Current mouse Y position
let animationId; // Stores the ID returned by requestAnimationFrame for cancellation

/**
 * Initializes the background canvas and starts the animation.
 * Sets up event listeners for window resize and mouse movement.
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
    document.addEventListener('mousemove', updateCursorPosition);

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
                size: 1.5, // Current rendered size of the dot
                targetSize: 1.5 // Desired size (influenced by mouse proximity)
            });
        }
    }
}

/**
 * Updates the global mouseX and mouseY variables based on cursor movement.
 * @param {MouseEvent} e - The mouse event object.
 */
function updateCursorPosition(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
}

/**
 * Calculates and updates the target size of each dot based on its proximity to the cursor.
 * Dots closer to the cursor will have a larger targetSize.
 */
function updateDotSizes() {
    const maxDistance = 150; // The maximum distance from the cursor for a dot to be affected
    const baseSize = 1.5;    // The default size of dots when not influenced by the cursor
    const maxScale = 3.5;    // Maximum multiplier for dot size when directly under the cursor

    dots.forEach(dot => {
        // Calculate the dot's current screen position, taking into account the background offset.
        // This is crucial because mouse coordinates are relative to the screen,
        // and dots might be shifted due to 'shiftBackground'.
        const dotScreenX = dot.x + offsetX;
        const dotScreenY = dot.y + offsetY;

        // Calculate the distance between the current dot and the cursor
        const dx = dotScreenX - mouseX;
        const dy = dotScreenY - mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < maxDistance) {
            // Calculate influence: 1 when directly under cursor, 0 at maxDistance
            const influence = 1 - (distance / maxDistance);
            // Calculate scale: baseSize when no influence, baseSize * (1 + maxScale) at max influence
            const scale = 1 + (influence * maxScale);
            dot.targetSize = baseSize * scale;
        } else {
            // Reset to base size if outside the influence range
            dot.targetSize = baseSize;
        }

        // Smoothly interpolate the current dot size towards its target size.
        // The 0.15 factor controls the speed of the smoothing animation.
        dot.size += (dot.targetSize - dot.size) * 0.15;
    });
}

/**
 * Adds a subtle, continuous floating movement to each dot.
 * This effect is based on time and the dot's index to create a gentle, varied motion.
 */
function addSubtleFloating() {
    const time = Date.now() * 0.001; // Convert current time to seconds for animation
    const floatAmplitudeX = 0.5; // Max horizontal floating displacement
    const floatAmplitudeY = 0.3; // Max vertical floating displacement

    dots.forEach((dot, index) => {
        // Use sine and cosine waves for smooth, oscillating movement
        // Add index * offset to ensure dots don't move in perfect sync
        const floatX = Math.sin(time + index * 0.1) * floatAmplitudeX;
        const floatY = Math.cos(time + index * 0.15) * floatAmplitudeY;

        // Apply floating movement relative to the base (original) position
        dot.x = dot.baseX + floatX;
        dot.y = dot.baseY + floatY;
    });
}

/**
 * The main animation loop. Clears the canvas, updates dot states (size, position),
 * draws the dots, and requests the next animation frame.
 */
function animateDots() {
    // Clear the entire canvas to prepare for the new frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply subtle floating movement to dots
    addSubtleFloating();

    // Update dot sizes based on cursor proximity
    updateDotSizes();

    // Set the drawing color for the dots (green with some transparency)
    ctx.fillStyle = "rgba(137, 255, 184, 0.8)";

    // Draw each dot
    dots.forEach(dot => {
        // Calculate the dot's final screen position, combining its current position (base + float)
        // and the overall background offset.
        const screenX = dot.x + offsetX;
        const screenY = dot.y + offsetY;

        // Performance optimization: Only draw dots that are currently visible on screen
        // This prevents rendering dots that are far off-screen.
        if (screenX > -10 && screenX < canvas.width + 10 &&
            screenY > -10 && screenY < canvas.height + 10) {
            ctx.beginPath();
            ctx.arc(screenX, screenY, dot.size, 0, Math.PI * 2); // Draw a circle (dot)
            ctx.fill(); // Fill the circle with the current fillStyle
        }
    });

    // Request the next animation frame, creating a continuous loop
    animationId = requestAnimationFrame(animateDots);
}

/**
 * Shifts the entire dot matrix background by the given delta values.
 * This can be used for parallax effects or general background movement.
 * @param {number} deltaX - The amount to shift horizontally.
 * @param {number} deltaY - The amount to shift vertically.
 */
function shiftBackground(deltaX, deltaY) {
    offsetX += deltaX;
    offsetY += deltaY;

    // Wrap offset to prevent values from growing infinitely large,
    // ensuring seamless repeating pattern if dots were infinite.
    // This uses the dot spacing to wrap, making it visually continuous.
    const spacing = 50;
    if (offsetX > spacing) offsetX -= spacing;
    if (offsetX < -spacing) offsetX += spacing;
    if (offsetY > spacing) offsetY -= spacing;
    if (offsetY < -spacing) offsetY += spacing;
}

/**
 * Cleans up event listeners and stops the animation loop.
 * Call this if the background needs to be removed or stopped.
 */
function cleanupBackground() {
    if (animationId) {
        cancelAnimationFrame(animationId); // Stop the animation loop
    }
    window.removeEventListener('resize', resizeCanvas);
    document.removeEventListener('mousemove', updateCursorPosition);
}

// Automatically initialize the background when the window loads
window.addEventListener('load', initBackground);
