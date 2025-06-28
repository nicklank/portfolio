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
    // Always use the position and scale from vis.js, ignore center
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

function animateDots() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Smooth position and zoom
    offsetX += (targetX - offsetX) * 0.05;
    offsetY += (targetY - offsetY) * 0.05;
    scale += (targetScale - scale) * 0.05;

    addSubtleFloating();
    updateDotSizes();

    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";

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
