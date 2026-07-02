// Eli's Barbershop - script.js

// ===== Mobile Navigation =====
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu') || document.getElementById('mobile-menu');

if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('active');
    hamburger.classList.toggle('open');
  });
}

// Close menu when a link is clicked
document.querySelectorAll('.mobile-menu a').forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('active');
    hamburger.classList.remove('open');
  });
});

// ===== Sticky Header Shadow =====
const siteHeader = document.getElementById('site-header');
if (siteHeader) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      siteHeader.classList.add('scrolled');
    } else {
      siteHeader.classList.remove('scrolled');
    }
  });
}

// ===== Carousel (continuous auto-scroll, seamless loop) =====
const track = document.getElementById('carouselTrack');
const prevBtn = document.getElementById('carouselPrev');
const nextBtn = document.getElementById('carouselNext');

if (track && prevBtn && nextBtn) {
  const originalSlides = Array.from(track.querySelectorAll('.carousel-slide:not([aria-hidden])'));

  const SPEED = 40; // pixels per second
  const RESUME_DELAY = 2500; // ms to stay paused after manual interaction

  let setWidth = 0;
  let offset = 0;
  let hoverPaused = false;
  let interactionPaused = false;
  let resumeTimer;
  let lastTime = null;

  function measure() {
    setWidth = originalSlides.reduce((sum, slide) => sum + slide.getBoundingClientRect().width, 0);
  }

  function render() {
    track.style.transform = 'translateX(-' + offset + 'px)';
  }

  function step(timestamp) {
    if (lastTime === null) lastTime = timestamp;
    const delta = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    if (!hoverPaused && !interactionPaused && setWidth > 0) {
      offset += SPEED * delta;
      if (offset >= setWidth) offset -= setWidth;
      render();
    }
    requestAnimationFrame(step);
  }

  function pauseForInteraction() {
    interactionPaused = true;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => { interactionPaused = false; }, RESUME_DELAY);
  }

  function slideBy(direction) {
    const slideWidth = setWidth / originalSlides.length;
    offset = (offset + direction * slideWidth + setWidth) % setWidth;
    render();
    pauseForInteraction();
  }

  nextBtn.addEventListener('click', () => slideBy(1));
  prevBtn.addEventListener('click', () => slideBy(-1));

  track.addEventListener('mouseenter', () => { hoverPaused = true; });
  track.addEventListener('mouseleave', () => { hoverPaused = false; });

  window.addEventListener('resize', measure);

  measure();
  requestAnimationFrame(step);
}

// ===== Scroll Animation (fade-in on scroll) =====
const observerOptions = {
  threshold: 0.15,
  rootMargin: '0px 0px -60px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll('.feature-card, .section-title, .pricing-card, .cta-text-block').forEach(el => {
  el.classList.add('fade-up');
  observer.observe(el);
});
