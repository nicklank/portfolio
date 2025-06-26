// ==============================
// Dot Matrix Background with Cursor Proximity Effect
// ==============================

let canvas, ctx;
let dots = [];
let offsetX = 0;
let offsetY = 0;
let mouseX = 0;
let mouseY = 0;
let animationId;

function initBackground() {
  console.log('initBackground called');
  
  canvas = document.getElementById('background-canvas');
  if (!canvas) {
    console.error('Background canvas not found! Make sure you have <canvas id="background-canvas"></canvas> in your HTML');
    return;
  }
  
  console.log('Canvas found:', canvas);
  ctx = canvas.getContext('2d');
  resizeCanvas();
  
  // Event listeners
  window.addEventListener('resize', resizeCanvas);
  document.addEventListener('mousemove', updateCursorPosition);
  
  console.log('Generating dots...');
  generateDots();
  console.log('Generated', dots.length, 'dots');
  
  console.log('Starting animation...');
  animateDots();
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  generateDots(); // Regenerate dots when canvas resizes
}

function generateDots() {
  dots = [];
  const spacing = 50;
  const cols = Math.ceil(canvas.width / spacing) + 2; // Extra dots for smooth scrolling
  const rows = Math.ceil(canvas.height / spacing) + 2;
  
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const x = col * spacing - spacing; // Start off-screen for smooth scrolling
      const y = row * spacing - spacing;
      dots.push({ 
        baseX: x, 
        baseY: y, 
        x: x, 
        y: y, 
        size: 1.5,
        targetSize: 1.5
      });
    }
  }
}

function updateCursorPosition(e) {
  // Get mouse position relative to the canvas
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
  
  // Debug: uncomment to see if mouse tracking works
  console.log('Mouse position:', mouseX, mouseY);
}

function updateDotSizes() {
  dots.forEach(dot => {
    // Calculate actual dot position including offset
    const dotScreenX = dot.x + offsetX;
    const dotScreenY = dot.y + offsetY;
    
    // Calculate distance from mouse to dot
    const dx = dotScreenX - mouseX;
    const dy = dotScreenY - mouseY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const maxDistance = 150; // Proximity range
    const maxScale = 4; // Maximum size multiplier
    
    if (distance < maxDistance) {
      // Create smooth falloff effect
      const influence = 1 - (distance / maxDistance);
      const easeInfluence = influence * influence; // Smoother falloff
      const scale = 1 + (easeInfluence * maxScale);
      dot.targetSize = 1.5 * scale;
    } else {
      dot.targetSize = 1.5;
    }
    
    // Smooth interpolation to target size (faster response)
    dot.size += (dot.targetSize - dot.size) * 0.3;
  });
  
  // Debug: Show how many dots are being affected
  const affectedDots = dots.filter(dot => dot.size > 1.6).length;
  if (affectedDots > 0) {
    console.log('Affected dots:', affectedDots, 'Mouse:', mouseX, mouseY);
  }
}

function animateDots() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Update dot sizes based on cursor proximity
  updateDotSizes();
  
  // Set dot color with slight transparency
  ctx.fillStyle = "rgba(137, 255, 184, 0.8)";
  
  // Draw dots
  dots.forEach(dot => {
    const screenX = dot.x + offsetX;
    const screenY = dot.y + offsetY;
    
    // Only draw dots that are visible on screen (performance optimization)
    if (screenX > -10 && screenX < canvas.width + 10 && 
        screenY > -10 && screenY < canvas.height + 10) {
      ctx.beginPath();
      ctx.arc(screenX, screenY, dot.size, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  
  animationId = requestAnimationFrame(animateDots);
}

function shiftBackground(deltaX, deltaY) {
  offsetX += deltaX;
  offsetY += deltaY;
  
  // Wrap offset to prevent infinite scrolling accumulation
  const spacing = 50;
  if (offsetX > spacing) offsetX -= spacing;
  if (offsetX < -spacing) offsetX += spacing;
  if (offsetY > spacing) offsetY -= spacing;
  if (offsetY < -spacing) offsetY += spacing;
}

// Clean up function (call this if you need to stop the animation)
function cleanupBackground() {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  window.removeEventListener('resize', resizeCanvas);
  document.removeEventListener('mousemove', updateCursorPosition);
}

// Optional: Add subtle floating animation to dots
function addSubtleFloating() {
  const time = Date.now() * 0.001;
  
  dots.forEach((dot, index) => {
    const floatX = Math.sin(time + index * 0.1) * 0.5;
    const floatY = Math.cos(time + index * 0.15) * 0.3;
    
    dot.x = dot.baseX + floatX;
    dot.y = dot.baseY + floatY;
  });
}

// Enhanced version with floating effect (optional)
function animateDotsWithFloating() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Add subtle floating movement
  addSubtleFloating();
  
  // Update dot sizes based on cursor proximity
  updateDotSizes();
  
  ctx.fillStyle = "rgba(137, 255, 184, 0.8)";
  
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
  
  animationId = requestAnimationFrame(animateDotsWithFloating);
}

// Call this instead of animateDots() if you want the floating effect
// animateDotsWithFloating();
