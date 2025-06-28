let canvas, ctx;
let dots = [];

let offsetX = 0;
let offsetY = 0;

let targetX = 0;
let targetY = 0;

let scale = 1;
let targetScale = 1;

let mouseX = 0;
let mouseY = 0;

let animationId;

let isLightMode = false;

function initBackground() {
    canvas = document.getElementById('background-canvas');
    if (!canvas) {
        console.warn('Background canvas not found.');
        return;
    }

    ctx = canvas.getContext('2d');
    resizeCanvas();

    window.addEventListener('resize', resizeCanvas);
    document.addEventListener('mousemove', updateCursorPosition);

    animateDots();
}

function updateCursorPosition(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
}

export function updateBackgroundTarget(position, newScale, center) {
    // Just use the position and scale from scripts.js
    targetX = position.x;
    targetY = position.y;
    targetScale = newScale;
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    generateDots();
}

function generateDots() {
    dots = [];
    const spacing = 50;
    const cols = Math.ceil(canvas.width / spacing) + 2;
    const rows = Math.ceil(canvas.height / spacing) + 2;

    const initialBaseDotSize = 1.5;

    for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rows; row++) {
            const x = col * spacing - spacing;
            const y = row * spacing - spacing;
            dots.push({
                baseX: x,
                baseY: y,
                x: x,
                y: y,
                size: initialBaseDotSize,
                targetSize: initialBaseDotSize
            });
        }
    }
}

function updateDotSizes() {
    const maxDistance = 150;
    const baseSize = 1;
    const maxScale = 3.5;

    dots.forEach(dot => {
        const dotScreenX = (dot.x + offsetX) * scale;
        const dotScreenY = (dot.y + offsetY) * scale;

        const dx = dotScreenX - mouseX;
        const dy = dotScreenY - mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < maxDistance) {
            const influence = 1 - (distance / maxDistance);
            const scaleFactor = 1 + (influence * maxScale);
            dot.targetSize = baseSize * scaleFactor;
        } else {
            dot.targetSize = baseSize;
        }

        dot.size += (dot.targetSize - dot.size) * 0.15;
    });
}

function addSubtleFloating() {
    const time = Date.now() * 0.003;
    const floatAmplitudeX = 0.55;
    const floatAmplitudeY = 0.55;

    dots.forEach((dot, index) => {
        const floatX = Math.sin(time + index * 0.1) * floatAmplitudeX;
        const floatY = Math.cos(time + index * 0.15) * floatAmplitudeY;
        dot.x = dot.baseX + floatX;
        dot.y = dot.baseY + floatY;
    });
}

// Simple efficient grain specs (replacing the big slow specs)
function drawAnimatedNoise() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; // Adjust opacity to taste
    
    for (let i = 0; i < 50; i++) { // 50 pixels per frame
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        // Vary size occasionally for more organic feel
        const size = Math.random() > 0.8 ? 2 : 1;
        ctx.fillRect(x, y, size, size);
    }
}

// Fine grain using ImageData (back to image-based approach)
function drawFineGrain() {
    const width = canvas.width;
    const height = canvas.height;
    
    // Create smaller area for performance but tile it
    const tileSize = 200; // Small tile to reduce processing
    const imageData = ctx.createImageData(tileSize, tileSize);
    const data = imageData.data;
    
    // Generate fine grain pattern
    for (let i = 0; i < data.length; i += 4) {
        if (Math.random() > 0.92) { // Only 8% of pixels get grain
            const intensity = Math.random() * 60; // Subtle intensity
            data[i] = intensity;     // Red
            data[i + 1] = intensity; // Green  
            data[i + 2] = intensity; // Blue
            data[i + 3] = 60;         // Low alpha for subtlety
        }
    }
    
    // Tile the small grain pattern across the screen
    for (let x = 0; x < width; x += tileSize) {
        for (let y = 0; y < height; y += tileSize) {
            ctx.putImageData(imageData, x, y);
        }
    }
}

function animateDots() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ADD BOTH NOISE LAYERS HERE - fine grain first (background), then big specs (foreground)
    drawFineGrain();
    drawAnimatedNoise();

    // Smooth position and zoom
    offsetX += (targetX - offsetX) * 0.05;
    offsetY += (targetY - offsetY) * 0.05;
    scale += (targetScale - scale) * 0.05;

    addSubtleFloating();
    updateDotSizes();

    ctx.fillStyle = isLightMode
    ? "rgba(67, 153, 102, 0.8)"   // Light green for light mode
    : "rgba(255, 255, 255, 0.2)"; // Grey/white for dark mode

    dots.forEach(dot => {
        const screenX = (dot.x + offsetX) * scale;
        const screenY = (dot.y + offsetY) * scale;

        if (screenX > -10 && screenX < canvas.width + 10 &&
            screenY > -10 && screenY < canvas.height + 10) {
            ctx.beginPath();
            ctx.arc(screenX, screenY, dot.size, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    animationId = requestAnimationFrame(animateDots);
}

function cleanupBackground() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    window.removeEventListener('resize', resizeCanvas);
    document.removeEventListener('mousemove', updateCursorPosition);
}

window.addEventListener('load', initBackground);

export function setBackgroundLightMode(light) {
    isLightMode = light;
}