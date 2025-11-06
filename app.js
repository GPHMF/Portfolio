// Theme Management
class ThemeManager {
    constructor() {
        this.theme = null;
        this.init();
    }

    init() {
        // Check system preference for initial theme
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.theme = prefersDark ? 'dark' : 'light';
        
        // Apply initial theme
        this.applyTheme();
        
        // Set up theme toggle button
        const toggleButton = document.getElementById('theme-toggle');
        if (toggleButton) {
            toggleButton.addEventListener('click', () => this.toggleTheme());
        }
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            this.theme = e.matches ? 'dark' : 'light';
            this.applyTheme();
        });
    }

    applyTheme() {
        if (this.theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    }

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme();
    }
}

// Initialize theme manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ThemeManager();
    });
} else {
    new ThemeManager();
}

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerOffset = 80;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Add scroll event for header shadow
let lastScroll = 0;
const header = document.querySelector('.header');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 10) {
        header.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
    } else {
        header.style.boxShadow = 'none';
    }
    
    lastScroll = currentScroll;
});

class ImageEnlarger {
  constructor() {
    this.modal = document.getElementById('image-modal');
    this.modalImage = document.getElementById('modal-image');
    this.closeButton = document.querySelector('.modal__close');
    this.overlay = document.querySelector('.modal__overlay');
    this.imageContainer = document.querySelector('.modal__image-container');
    this.prevButton = document.querySelector('.modal__nav--prev');
    this.nextButton = document.querySelector('.modal__nav--next');
    
    // Zoom and pan properties
    this.currentZoom = 1;
    this.minZoom = 1;
    this.maxZoom = 4;
    this.zoomStep = 0.2;
    
    // Pan/drag state
    this.isPanning = false;
    this.panStartX = 0;
    this.panStartY = 0;
    this.panOffsetX = 0;
    this.panOffsetY = 0;
    
    // Momentum scrolling
    this.lastPanVelocityX = 0;
    this.lastPanVelocityY = 0;
    this.lastPanTime = 0;
    this.momentumAnimationId = null;
    
    // Pinch-to-zoom state
    this.isPinching = false;
    this.initialPinchDistance = 0;
    this.pinchStartZoom = 1;
    
    // Image navigation
    this.allEnlargeableImages = [];
    this.currentImageIndex = -1;
    
    this.init();
  }

  init() {
    // Collect all enlargeable images
    this.allEnlargeableImages = Array.from(
      document.querySelectorAll('img[data-enlargeable]')
    );

    // Gallery images click handlers
    this.allEnlargeableImages.forEach((img, index) => {
      img.addEventListener('click', (e) => this.openModal(e, index));
    });

    // Modal controls
    if (this.closeButton) {
      this.closeButton.addEventListener('click', () => this.closeModal());
    }

    if (this.overlay) {
      this.overlay.addEventListener('click', () => this.closeModal());
    }

    if (this.prevButton) {
      this.prevButton.addEventListener('click', () => this.showPreviousImage());
    }

    if (this.nextButton) {
      this.nextButton.addEventListener('click', () => this.showNextImage());
    }

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      if (!this.modal.classList.contains('active')) return;

      if (e.key === 'Escape') {
        this.closeModal();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.showPreviousImage();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.showNextImage();
      }
    });

    // Zoom
    if (this.imageContainer) {
      this.imageContainer.addEventListener('wheel', (e) => this.handleZoom(e));
    }

    // Pan
    if (this.modalImage) {
      this.modalImage.addEventListener('mousedown', (e) => this.startPan(e));
      this.modalImage.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    }

    document.addEventListener('mousemove', (e) => this.handlePan(e));
    document.addEventListener('mouseup', (e) => this.endPan(e));
    document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
  }

  openModal(event, imageIndex) {
    const img = event.target;
    this.currentImageIndex = imageIndex;
    this.loadImage(img.src, img.alt);
    
    this.modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    this.updateNavigationButtons();
  }

  loadImage(src, alt) {
    this.modalImage.src = src;
    this.modalImage.alt = alt;
    
    // Reset zoom and pan
    this.currentZoom = 1;
    this.panOffsetX = 0;
    this.panOffsetY = 0;
    this.isPanning = false;
    this.isPinching = false;
    this.cancelMomentumAnimation();
    
    this.updateImageZoom();
  }

  showPreviousImage() {
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
      const img = this.allEnlargeableImages[this.currentImageIndex];
      this.loadImage(img.src, img.alt);
      this.updateNavigationButtons();
    }
  }

  showNextImage() {
    if (this.currentImageIndex < this.allEnlargeableImages.length - 1) {
      this.currentImageIndex++;
      const img = this.allEnlargeableImages[this.currentImageIndex];
      this.loadImage(img.src, img.alt);
      this.updateNavigationButtons();
    }
  }

  updateNavigationButtons() {
    // Disable previous button if at first image
    if (this.prevButton) {
      this.prevButton.disabled = this.currentImageIndex === 0;
    }

    // Disable next button if at last image
    if (this.nextButton) {
      this.nextButton.disabled = this.currentImageIndex === this.allEnlargeableImages.length - 1;
    }
  }

  closeModal() {
    this.modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    this.currentZoom = 1;
    this.panOffsetX = 0;
    this.panOffsetY = 0;
    this.isPanning = false;
    this.isPinching = false;
    this.currentImageIndex = -1;
    this.cancelMomentumAnimation();
  }

  handleZoom(event) {
    event.preventDefault();
    if (!this.modal.classList.contains('active')) return;

    const zoomDirection = event.deltaY > 0 ? -1 : 1;
    const newZoom = this.currentZoom + zoomDirection * this.zoomStep;

    this.currentZoom = Math.max(this.minZoom, Math.min(newZoom, this.maxZoom));
    
    if (this.currentZoom === this.minZoom) {
      this.panOffsetX = 0;
      this.panOffsetY = 0;
    }
    
    this.cancelMomentumAnimation();
    this.updateImageZoom();
  }

  // Pan and momentum methods (same as before)
  startPan(event) {
    if (this.currentZoom === this.minZoom || this.isPanning) return;

    event.preventDefault();
    this.isPanning = true;
    this.cancelMomentumAnimation();

    this.panStartX = event.clientX;
    this.panStartY = event.clientY;
    this.lastPanTime = Date.now();
  }

  handlePan(event) {
    if (!this.isPanning) return;

    event.preventDefault();

    const currentX = event.clientX;
    const currentY = event.clientY;
    const currentTime = Date.now();

    const deltaX = currentX - this.panStartX;
    const deltaY = currentY - this.panStartY;
    const deltaTime = currentTime - this.lastPanTime;

    if (deltaTime > 0) {
      this.lastPanVelocityX = deltaX / deltaTime;
      this.lastPanVelocityY = deltaY / deltaTime;
    }

    this.panOffsetX += deltaX;
    this.panOffsetY += deltaY;

    this.constrainPan();
    this.updateImageZoom();

    this.panStartX = currentX;
    this.panStartY = currentY;
    this.lastPanTime = currentTime;
  }

  endPan(event) {
    if (!this.isPanning) return;
    this.isPanning = false;
    this.applyMomentum();
  }

  handleTouchStart(event) {
    this.cancelMomentumAnimation();

    if (event.touches.length === 2) {
      this.isPinching = true;
      this.initialPinchDistance = this.getPinchDistance(event.touches);
      this.pinchStartZoom = this.currentZoom;
      event.preventDefault();
    } else if (event.touches.length === 1 && this.currentZoom > this.minZoom) {
      this.isPanning = true;
      this.panStartX = event.touches[0].clientX;
      this.panStartY = event.touches[0].clientY;
      this.lastPanTime = Date.now();
      event.preventDefault();
    }
  }

  handleTouchMove(event) {
    if (event.touches.length === 2 && this.isPinching) {
      event.preventDefault();
      const currentPinchDistance = this.getPinchDistance(event.touches);
      const pinchRatio = currentPinchDistance / this.initialPinchDistance;
      
      this.currentZoom = Math.max(
        this.minZoom,
        Math.min(this.pinchStartZoom * pinchRatio, this.maxZoom)
      );
      
      this.updateImageZoom();
    } else if (event.touches.length === 1 && this.isPanning) {
      event.preventDefault();

      const currentX = event.touches[0].clientX;
      const currentY = event.touches[0].clientY;
      const currentTime = Date.now();

      const deltaX = currentX - this.panStartX;
      const deltaY = currentY - this.panStartY;
      const deltaTime = currentTime - this.lastPanTime;

      if (deltaTime > 0) {
        this.lastPanVelocityX = deltaX / deltaTime;
        this.lastPanVelocityY = deltaY / deltaTime;
      }

      this.panOffsetX += deltaX;
      this.panOffsetY += deltaY;

      this.constrainPan();
      this.updateImageZoom();

      this.panStartX = currentX;
      this.panStartY = currentY;
      this.lastPanTime = currentTime;
    }
  }

  handleTouchEnd(event) {
    if (event.touches.length === 1 && this.isPinching) {
      this.isPinching = false;
      this.isPanning = true;
      this.panStartX = event.touches[0].clientX;
      this.panStartY = event.touches[0].clientY;
      this.lastPanTime = Date.now();
    } else if (event.touches.length === 0) {
      this.isPinching = false;
      if (this.isPanning) {
        this.isPanning = false;
        this.applyMomentum();
      }
    }
  }

  getPinchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  constrainPan() {
    const containerRect = this.imageContainer.getBoundingClientRect();
    const maxPanX = (containerRect.width * (this.currentZoom - 1)) / 2;
    const maxPanY = (containerRect.height * (this.currentZoom - 1)) / 2;

    this.panOffsetX = Math.max(-maxPanX, Math.min(this.panOffsetX, maxPanX));
    this.panOffsetY = Math.max(-maxPanY, Math.min(this.panOffsetY, maxPanY));
  }

  applyMomentum() {
    if (Math.abs(this.lastPanVelocityX) < 0.1 && Math.abs(this.lastPanVelocityY) < 0.1) {
      return;
    }

    const friction = 0.95;
    const animate = () => {
      this.lastPanVelocityX *= friction;
      this.lastPanVelocityY *= friction;

      this.panOffsetX += this.lastPanVelocityX;
      this.panOffsetY += this.lastPanVelocityY;

      this.constrainPan();
      this.updateImageZoom();

      if (Math.abs(this.lastPanVelocityX) > 0.1 || Math.abs(this.lastPanVelocityY) > 0.1) {
        this.momentumAnimationId = requestAnimationFrame(animate);
      } else {
        this.momentumAnimationId = null;
      }
    };

    animate();
  }

  cancelMomentumAnimation() {
    if (this.momentumAnimationId !== null) {
      cancelAnimationFrame(this.momentumAnimationId);
      this.momentumAnimationId = null;
    }
    this.lastPanVelocityX = 0;
    this.lastPanVelocityY = 0;
  }

  updateImageZoom() {
    this.modalImage.style.transform = `scale(${this.currentZoom}) translate(${this.panOffsetX}px, ${this.panOffsetY}px)`;
    
    if (this.currentZoom > this.minZoom) {
      this.modalImage.classList.add('zoomed');
    } else {
      this.modalImage.classList.remove('zoomed');
    }
  }
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ImageEnlarger();
  });
} else {
  new ImageEnlarger();
}