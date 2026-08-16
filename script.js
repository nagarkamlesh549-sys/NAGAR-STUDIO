(function () {
  const TOTAL_FRAMES = 176;
  const canvas = document.getElementById('frame-canvas');
  const ctx = canvas.getContext('2d');
  const loader = document.getElementById('loader');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');

  const images = [];
  let loadedCount = 0;
  let currentFrame = 0;
  let targetFrame = 0;
  let lastDrawnFrame = -1;
  let isLoaded = false;

  // Frame path generator: frame_000001.jpg ... frame_000176.jpg
  function getFramePath(index) {
    const frameNum = String(index + 1).padStart(6, '0');
    return `frame_${frameNum}.jpg`;
  }

  // Preload all 176 frames
  function preloadFrames() {
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = getFramePath(i);

      img.onload = () => {
        loadedCount++;
        const percent = Math.floor((loadedCount / TOTAL_FRAMES) * 100);
        
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressText) progressText.textContent = `${percent}%`;

        // Render first frame immediately
        if (i === 0 && !isLoaded) {
          resizeCanvas();
          drawFrame(0);
        }

        if (loadedCount === TOTAL_FRAMES) {
          onAllFramesLoaded();
        }
      };

      img.onerror = () => {
        console.error(`Failed to load frame ${i + 1}`);
        loadedCount++;
        if (loadedCount === TOTAL_FRAMES) {
          onAllFramesLoaded();
        }
      };

      images.push(img);
    }
  }

  function onAllFramesLoaded() {
    isLoaded = true;
    setTimeout(() => {
      if (loader) loader.classList.add('loaded');
    }, 200);
  }

  // Canvas High-DPI Resizing
  function resizeCanvas() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    lastDrawnFrame = -1;
  }

  // Object-Fit Cover Calculation for Canvas
  function drawCoverImage(img) {
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    const canvasRatio = cw / ch;
    const imageRatio = iw / ih;

    let drawWidth, drawHeight, offsetX, offsetY;

    if (canvasRatio > imageRatio) {
      drawWidth = cw;
      drawHeight = cw / imageRatio;
      offsetX = 0;
      offsetY = (ch - drawHeight) / 2;
    } else {
      drawWidth = ch * imageRatio;
      drawHeight = ch;
      offsetX = (cw - drawWidth) / 2;
      offsetY = 0;
    }

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

    // Patch out silver star logo in bottom right corner (source coords: 1698,850 in 1920x1080)
    const scaleX = drawWidth / iw;
    const scaleY = drawHeight / ih;

    const cleanSx = 1608 * scaleX + offsetX;
    const cleanSy = 850 * scaleY + offsetY;
    const patchW = 92 * scaleX;
    const patchH = 100 * scaleY;

    const targetSx = 1698 * scaleX + offsetX;
    const targetSy = 850 * scaleY + offsetY;

    ctx.drawImage(canvas, cleanSx, cleanSy, patchW, patchH, targetSx, targetSy, patchW, patchH);
  }

  function drawFrame(index) {
    const frameIdx = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(index)));
    const img = images[frameIdx];

    if (img && img.complete) {
      drawCoverImage(img);
      lastDrawnFrame = frameIdx;
    }
  }

  function updateTargetFrame() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollable > 0) {
      const scrollFraction = Math.max(0, Math.min(1, window.scrollY / scrollable));
      targetFrame = scrollFraction * (TOTAL_FRAMES - 1);
    }
  }

  // Smooth Lerp Render Loop
  function animationLoop() {
    const ease = 0.15;
    const delta = targetFrame - currentFrame;

    if (Math.abs(delta) > 0.001) {
      currentFrame += delta * ease;
    } else {
      currentFrame = targetFrame;
    }

    const roundedFrame = Math.round(currentFrame);
    if (roundedFrame !== lastDrawnFrame) {
      drawFrame(roundedFrame);
    }

    requestAnimationFrame(animationLoop);
  }

  // IntersectionObserver for Scroll Reveal Animations
  function initScrollReveal() {
    const observerOptions = {
      root: null,
      threshold: 0.15,
      rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, observerOptions);

    document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
      observer.observe(el);
    });
  }

  // Mobile Navigation Menu Toggle
  function initMobileMenu() {
    const mobileToggle = document.getElementById('mobile-toggle');
    const navMenu = document.getElementById('nav-menu');

    if (mobileToggle && navMenu) {
      mobileToggle.addEventListener('click', () => {
        navMenu.classList.toggle('open');
      });

      // Close menu on link click
      navMenu.querySelectorAll('.nav-link').forEach((link) => {
        link.addEventListener('click', () => {
          navMenu.classList.remove('open');
        });
      });
    }
  }

  // Active Nav Link Highlight on Scroll
  function initActiveNavHighlight() {
    const sections = document.querySelectorAll('section.section');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
      let currentSection = '';

      sections.forEach((section) => {
        const sectionTop = section.offsetTop - 150;
        const sectionHeight = section.clientHeight;
        if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
          currentSection = section.getAttribute('id');
        }
      });

      navLinks.forEach((link) => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentSection}`) {
          link.classList.add('active');
        }
      });
    }, { passive: true });
  }

  // Contact Form Submission -> Opens WhatsApp with prefilled inquiry message
  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('name')?.value || '';
      const email = document.getElementById('email')?.value || '';
      const date = document.getElementById('date')?.value || '';
      const location = document.getElementById('location')?.value || '';
      const message = document.getElementById('message')?.value || '';

      const text = `Hi Nagar Studio,\n\nI would like to inquire about booking a session.\n\n*Name:* ${name}\n*Email:* ${email}\n*Event Date:* ${date}\n*Location:* ${location}\n*Details:* ${message}`;

      const whatsappUrl = `https://wa.me/918103383722?text=${encodeURIComponent(text)}`;
      window.open(whatsappUrl, '_blank');
    });
  }

  // Portfolio Category Tab Filter
  function initPortfolioTabs() {
    const tabBtns = document.querySelectorAll('.portfolio-tabs .tab-btn');
    const cards = document.querySelectorAll('.portfolio-grid .portfolio-card');

    if (!tabBtns.length || !cards.length) return;

    function applyFilter(category) {
      const categoryCounts = {};

      cards.forEach((card) => {
        const cardCat = card.getAttribute('data-category');

        if (category === 'all') {
          categoryCounts[cardCat] = (categoryCounts[cardCat] || 0) + 1;
          // Keep only first 2 images from each category for "All Works"
          if (categoryCounts[cardCat] <= 2) {
            card.classList.remove('hide');
          } else {
            card.classList.add('hide');
          }
        } else {
          // Specific category tab selected -> show all images in that category
          if (cardCat === category) {
            card.classList.remove('hide');
          } else {
            card.classList.add('hide');
          }
        }
      });
    }

    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const category = btn.getAttribute('data-category');
        applyFilter(category);
      });
    });

    // Apply default "all" filter (10 images total - 2 per section) on initialization
    applyFilter('all');
  }

  // Portfolio Lightbox Modal & Carousel Slider
  function initLightbox() {
    const modal = document.getElementById('lightbox-modal');
    const modalImg = document.getElementById('lightbox-img');
    const modalCat = document.getElementById('lightbox-cat');
    const modalTitle = document.getElementById('lightbox-title');
    const counterEl = document.getElementById('lightbox-counter');
    const backBtn = document.getElementById('lightbox-back-btn');
    const closeIcon = document.getElementById('lightbox-close-icon');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');

    if (!modal || !modalImg) return;

    let visibleCards = [];
    let currentIndex = 0;

    function getVisibleCards() {
      return Array.from(document.querySelectorAll('.portfolio-grid .portfolio-card:not(.hide)'));
    }

    function showPhoto(index) {
      visibleCards = getVisibleCards();
      if (!visibleCards.length) return;

      if (index < 0) index = visibleCards.length - 1;
      if (index >= visibleCards.length) index = 0;

      currentIndex = index;
      const card = visibleCards[currentIndex];
      const img = card.querySelector('.portfolio-img');
      const cat = card.querySelector('.portfolio-cat')?.textContent || '';
      const title = card.querySelector('.portfolio-title')?.textContent || '';

      if (img) {
        modalImg.src = img.src;
        modalImg.alt = img.alt || title;
        if (modalCat) modalCat.textContent = cat;
        if (modalTitle) modalTitle.textContent = title;
        if (counterEl) counterEl.textContent = `Photo ${currentIndex + 1} of ${visibleCards.length}`;
      }
    }

    function openLightbox(cardElement) {
      visibleCards = getVisibleCards();
      const index = visibleCards.indexOf(cardElement);
      showPhoto(index >= 0 ? index : 0);
      modal.classList.add('open');
    }

    function closeModal() {
      modal.classList.remove('open');
    }

    function nextPhoto() {
      showPhoto(currentIndex + 1);
    }

    function prevPhoto() {
      showPhoto(currentIndex - 1);
    }

    // Attach click listener to all cards
    document.querySelectorAll('.portfolio-card').forEach((card) => {
      card.addEventListener('click', () => {
        openLightbox(card);
      });
    });

    // Control buttons
    if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); nextPhoto(); });
    if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); prevPhoto(); });
    if (backBtn) backBtn.addEventListener('click', (e) => { e.stopPropagation(); closeModal(); });
    if (closeIcon) closeIcon.addEventListener('click', (e) => { e.stopPropagation(); closeModal(); });

    // Click ANYWHERE except on the photo itself or side arrow buttons to return to website
    modal.addEventListener('click', (e) => {
      const isPhoto = (e.target === modalImg);
      const isArrow = e.target.classList.contains('lightbox-arrow') || e.target.closest('.lightbox-arrow');

      if (!isPhoto && !isArrow) {
        closeModal();
      }
    });

    // Keyboard navigation (Arrow keys & Escape)
    document.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('open')) return;

      if (e.key === 'ArrowRight') {
        nextPhoto();
      } else if (e.key === 'ArrowLeft') {
        prevPhoto();
      } else if (e.key === 'Escape') {
        closeModal();
      }
    });

    // Touch Swipe Navigation for Mobile
    let touchStartX = 0;
    let touchEndX = 0;

    modal.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    modal.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const diffX = touchEndX - touchStartX;
      if (Math.abs(diffX) > 45) {
        if (diffX < 0) {
          nextPhoto();
        } else {
          prevPhoto();
        }
      }
    }, { passive: true });
  }

  // Initialize
  window.addEventListener('resize', () => {
    resizeCanvas();
    drawFrame(currentFrame);
  });

  window.addEventListener('scroll', updateTargetFrame, { passive: true });

  resizeCanvas();
  preloadFrames();
  updateTargetFrame();
  requestAnimationFrame(animationLoop);

  document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    initMobileMenu();
    initActiveNavHighlight();
    initContactForm();
    initPortfolioTabs();
    initLightbox();
  });
})();
