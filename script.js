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

// ===== Carousel =====
const track = document.getElementById('carouselTrack');
const prevBtn = document.getElementById('carouselPrev');
const nextBtn = document.getElementById('carouselNext');

if (track && prevBtn && nextBtn) {
  const slides = track.querySelectorAll('.carousel-slide');
  let currentIndex = 0;
  let slidesVisible = getSlidesVisible();
  let autoPlayInterval;

  function getSlidesVisible() {
    if (window.innerWidth <= 768) return 1;
    if (window.innerWidth <= 900) return 2;
    return 3;
  }

  function updateCarousel() {
    const slideWidth = 100 / getSlidesVisible();
    const offset = currentIndex * slideWidth;
    track.style.transform = 'translateX(-' + offset + '%)';
  }

  function clampIndex() {
    const maxIndex = slides.length - getSlidesVisible();
    if (currentIndex < 0) currentIndex = maxIndex;
    if (currentIndex > maxIndex) currentIndex = 0;
  }

  nextBtn.addEventListener('click', () => {
    currentIndex++;
    clampIndex();
    updateCarousel();
    resetAutoPlay();
  });

  prevBtn.addEventListener('click', () => {
    currentIndex--;
    clampIndex();
    updateCarousel();
    resetAutoPlay();
  });

  function startAutoPlay() {
    autoPlayInterval = setInterval(() => {
      currentIndex++;
      clampIndex();
      updateCarousel();
    }, 4000);
  }

  function resetAutoPlay() {
    clearInterval(autoPlayInterval);
    startAutoPlay();
  }

  window.addEventListener('resize', () => {
    slidesVisible = getSlidesVisible();
    clampIndex();
    updateCarousel();
  });

  // Set initial slide widths
  slides.forEach(slide => {
    slide.style.minWidth = (100 / getSlidesVisible()) + '%';
  });

  window.addEventListener('resize', () => {
    slides.forEach(slide => {
      slide.style.minWidth = (100 / getSlidesVisible()) + '%';
    });
  });

  startAutoPlay();
  updateCarousel();
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
