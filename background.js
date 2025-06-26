// ==============================
// Dot Matrix Background
// ==============================

let canvas, ctx;
let dots = [];
let offsetX = 0;
let offsetY = 0;

function initBackground() {
  canvas = document.getElementById('background-canvas');
  ctx = canvas.getContext('2d');

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  document.addEventListener('mousemove', updateDotSizeByCursor);

  generateDots();
  animateDots();
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function generateDots() {
  dots = [];
  const spacing = 50;

  for (let x = 0; x < canvas.width; x += spacing) {
    for (let y = 0; y < canvas.height; y += spacing) {
      dots.push({ baseX: x, baseY: y, x: x, y: y, size: 1.5 });
    }
  }
}

function updateDotSizeByCursor(e) {
  const cursorX = e.clientX;
  const cursorY = e.clientY;

  dots.forEach(dot => {
    const dx = dot.x - cursorX;
    const dy = dot.y - cursorY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = 200;

    if (distance < maxDistance) {
      const scale = 1 + (1 - distance / maxDistance) * 2.5; // max size multiplier
      dot.size = 1.5 * scale;
    } else {
      dot.size = 1.5;
    }
  });
}

function animateDots() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#89ffb8";
  dots.forEach(dot => {
    ctx.beginPath();
    ctx.arc(dot.x + offsetX, dot.y + offsetY, dot.size, 0, Math.PI * 2);
    ctx.fill();
  });

  requestAnimationFrame(animateDots);
}

function shiftBackground(deltaX, deltaY) {
  offsetX += deltaX;
  offsetY += deltaY;
}

function startNodeFloating() {
  setInterval(() => {
    const positions = network.getPositions();
    Object.keys(positions).forEach(nodeId => {
      const node = nodes.get(nodeId);
      const offset = Math.random() * 0.3 - 0.15; // subtle movement
      nodes.update({ id: nodeId, x: node.x + offset, y: node.y + offset });
    });
  }, 1000); // Every second
}
