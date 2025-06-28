// ==============================
// Halftone.js - Interactive Image Effect Library
// ==============================

class HalftoneEffect {
  constructor(imageElement, options = {}) {
    this.sourceImage = imageElement;
    this.canvas = null;
    this.ctx = null;
    this.imageData = null;
    this.animationFrame = null;
    this.mousePos = { x: 0.5, y: 0.5 }; // Normalized 0-1
    
    // Default configuration
    this.config = {
      spacing: 15,
      maxSize: 12,
      minSize: 0,
      contrast: 1.0,
      threshold: 128,
      angle: 0,
      mouseInfluence: 0.5, // How much mouse affects the effect (0-1)
      interactive: true,
      smoothing: 0.0, // Animation smoothing
      dotColor: '#ffffff', // Add this line - default to white
      ...options
    };

    this.targetConfig = { ...this.config };
    this.init();
  }

  init() {
    this.createCanvas();
    this.setupImageData();
    this.setupMouseTracking();
    this.render();
  }

  createCanvas() {
    // Create canvas element
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Match source image dimensions
    const rect = this.sourceImage.getBoundingClientRect();
    this.canvas.width = this.sourceImage.naturalWidth || rect.width;
    this.canvas.height = this.sourceImage.naturalHeight || rect.height;
    
    // Apply same styling as source image
    this.canvas.style.cssText = this.sourceImage.style.cssText;
    this.canvas.style.maxWidth = '100%';
    this.canvas.style.height = 'auto';
    
    // Replace source image with canvas
    this.sourceImage.parentNode.insertBefore(this.canvas, this.sourceImage);
    this.sourceImage.style.display = 'none';
  }

  setupImageData() {
    // Draw source image to canvas to get pixel data
    this.ctx.drawImage(this.sourceImage, 0, 0, this.canvas.width, this.canvas.height);
    this.imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  setupMouseTracking() {
    if (!this.config.interactive) return;

    const updateMousePos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos.x = (e.clientX - rect.left) / rect.width;
      this.mousePos.y = (e.clientY - rect.top) / rect.height;
      
      // Clamp to 0-1 range
      this.mousePos.x = Math.max(0, Math.min(1, this.mousePos.x));
      this.mousePos.y = Math.max(0, Math.min(1, this.mousePos.y));

      this.updateFromMouse();
    };

    this.canvas.addEventListener('mousemove', updateMousePos);
    this.canvas.addEventListener('mouseenter', updateMousePos);
    
    // Reset on mouse leave
    this.canvas.addEventListener('mouseleave', () => {
      this.mousePos = { x: 0.5, y: 0.5 };
      this.updateFromMouse();
    });
  }

  updateFromMouse() {
    const influence = this.config.mouseInfluence;
    
    // Mouse affects angle based on X position
    this.targetConfig.angle = (this.mousePos.x - 0.5) * 45 * influence;
    
    // Mouse affects dot size based on Y position
    const sizeMultiplier = 1 + (this.mousePos.y - 0.5) * influence;
    this.targetConfig.maxSize = this.config.maxSize * sizeMultiplier;
    
    // Mouse affects spacing based on distance from center
    const centerDistance = Math.sqrt(
      Math.pow(this.mousePos.x - 0.5, 2) + 
      Math.pow(this.mousePos.y - 0.5, 2)
    );
    this.targetConfig.spacing = this.config.spacing * (1 + centerDistance * influence * 0.5);
  }

  // Smooth interpolation between current and target values
  interpolateConfig() {
    const lerp = (a, b, t) => a + (b - a) * t;
    const smoothing = this.config.smoothing;
    
    this.config.angle = lerp(this.config.angle, this.targetConfig.angle, smoothing);
    this.config.maxSize = lerp(this.config.maxSize, this.targetConfig.maxSize, smoothing);
    this.config.spacing = lerp(this.config.spacing, this.targetConfig.spacing, smoothing);
  }

  generateHalftone() {
    if (!this.imageData) return;

    // Smooth config interpolation for animations
    if (this.config.interactive) {
      this.interpolateConfig();
    }

    const { spacing, maxSize, minSize, contrast, threshold, angle } = this.config;
    const angleRad = angle * Math.PI / 180;

    // Clear canvas with transparent background
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = this.config.dotColor; // Use configured dot color

    const width = this.canvas.width;
    const height = this.canvas.height;
    const data = this.imageData.data;

    // Generate halftone dots
    for (let y = spacing / 2; y < height; y += spacing) {
      for (let x = spacing / 2; x < width; x += spacing) {
        // Apply rotation
        const centerX = width / 2;
        const centerY = height / 2;
        
        const rotatedX = Math.cos(angleRad) * (x - centerX) - Math.sin(angleRad) * (y - centerY) + centerX;
        const rotatedY = Math.sin(angleRad) * (x - centerX) + Math.cos(angleRad) * (y - centerY) + centerY;
        
        // Check bounds
        if (rotatedX < 0 || rotatedX >= width || rotatedY < 0 || rotatedY >= height) continue;
        
        // Sample pixel
        const pixelIndex = (Math.floor(rotatedY) * width + Math.floor(rotatedX)) * 4;
        
        if (pixelIndex >= 0 && pixelIndex < data.length) {
          const r = data[pixelIndex];
          const g = data[pixelIndex + 1];
          const b = data[pixelIndex + 2];
          
          // Convert to grayscale
          let gray = (r * 0.299 + g * 0.587 + b * 0.114);
          
          // Apply contrast
          gray = ((gray - 128) * contrast + 128);
          gray = Math.max(0, Math.min(255, gray));
          
          // Calculate dot size (darker = bigger dots)
          const darkness = 255 - gray;
          const normalizedDarkness = darkness / 255;
          
          // Apply threshold
          const thresholdFactor = gray < threshold ? 1 : normalizedDarkness;
          const dotRadius = minSize + (thresholdFactor * (maxSize - minSize));
          
          if (dotRadius > 0.5) {
            this.ctx.beginPath();
            this.ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
            this.ctx.fill();
          }
        }
      }
    }
  }

  render() {
    this.generateHalftone();
    
    if (this.config.interactive) {
      this.animationFrame = requestAnimationFrame(() => this.render());
    }
  }

  // Public methods for dynamic control
  updateConfig(newConfig) {
    Object.assign(this.config, newConfig);
    Object.assign(this.targetConfig, newConfig);
    
    if (!this.config.interactive) {
      this.render();
    }
  }

  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    // Restore original image
    this.sourceImage.style.display = '';
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }

  // Static method to apply to multiple images
  static applyToImages(selector, options = {}) {
    const images = document.querySelectorAll(selector);
    const instances = [];
    
    images.forEach(img => {
      if (img.complete) {
        instances.push(new HalftoneEffect(img, options));
      } else {
        img.addEventListener('load', () => {
          instances.push(new HalftoneEffect(img, options));
        });
      }
    });
    
    return instances;
  }

  // Preset configurations
  static presets = {
    newspaper: {
      spacing: 20,
      maxSize: 15,
      contrast: 1.2,
      threshold: 128,
      angle: 15,
      mouseInfluence: 0.3
    },
    comic: {
      spacing: 12,
      maxSize: 10,
      contrast: 1.8,
      threshold: 100,
      mouseInfluence: 0.7
    },
    fine: {
      spacing: 8,
      maxSize: 6,
      contrast: 1.0,
      threshold: 150,
      mouseInfluence: 0.2
    },
    interactive: {
      spacing: 15,
      maxSize: 12,
      contrast: 1.5,
      threshold: 120,
      mouseInfluence: 0.8,
      smoothing: 0.15
    }
  };
}

// ==============================
// Usage Examples & Utilities
// ==============================

// Easy initialization function
function initHalftone(selector, preset = 'interactive') {
  const config = HalftoneEffect.presets[preset] || {};
  return HalftoneEffect.applyToImages(selector, config);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HalftoneEffect, initHalftone };
}

// Global access for direct script inclusion
if (typeof window !== 'undefined') {
  window.HalftoneEffect = HalftoneEffect;
  window.initHalftone = initHalftone;
}

/*
// ==============================
// USAGE EXAMPLES:
// ==============================

// 1. Simple usage - apply to all images with class
initHalftone('.halftone-image', 'interactive');

// 2. Manual instantiation with custom config
const myImage = document.querySelector('#hero-image');
const halftone = new HalftoneEffect(myImage, {
  spacing: 20,
  maxSize: 15,
  mouseInfluence: 0.6,
  interactive: true
});

// 3. Apply to specific images with different presets
HalftoneEffect.applyToImages('.project-image', HalftoneEffect.presets.comic);

// 4. Dynamic updates
halftone.updateConfig({ 
  spacing: 10, 
  contrast: 2.0 
});

// 5. Non-interactive static halftone
new HalftoneEffect(document.querySelector('.static-image'), {
  interactive: false,
  spacing: 25,
  maxSize: 20
});
*/