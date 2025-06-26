// background.js

let canvas, ctx;
let dots = [];
const spacing = 40;
const rows = Math.ceil(window.innerHeight / spacing) + 2;
const cols = Math.ceil(window.innerWidth / spacing) + 2;
let offsetX = 0;
let offsetY = 0;

// Initialize canvas
function initBackground() {
  canvas = document.getElementById('background-canvas');
  ctx = canvas.getContext('2d');

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Create grid of dots
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      dots.push({ x: x * spacing, y: y * spacing });
    }
  }

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  requestAnimationFrame(drawBackground);
}

// Track mouse for proximity
let cursor = { x: 0, y: 0 };
document.addEventListener('mousemove', (e) => {
  cursor.x = e.clientX;
  cursor.y = e.clientY;
});

// Draw background with proximity-based dot sizing
function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  dots.forEach(dot => {
    const dx = cursor.x - (dot.x + offsetX);
    const dy = cursor.y - (dot.y + offsetY);
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxEffectRadius = 200;

    let size = 1.5;
    if (distance < maxEffectRadius) {
      size = 1.5 + (1 - distance / maxEffectRadius) * 4; // Size maxes out at ~5.5px
    }

    ctx.beginPath();
    ctx.arc(dot.x + offsetX, dot.y + offsetY, size, 0, Math.PI * 2);
    ctx.fillStyle = '#444';
    ctx.fill();
  });

  requestAnimationFrame(drawBackground);
}

// Parallax shifting function
function shiftBackground(dx, dy) {
  offsetX += dx;
  offsetY += dy;
}

export { initBackground, shiftBackground };
