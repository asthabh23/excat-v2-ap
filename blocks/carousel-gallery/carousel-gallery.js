function updateActiveSlide(slide, skipButtonUpdate = false) {
  const block = slide.closest('.carousel-gallery');
  const slideIndex = parseInt(slide.dataset.slideIndex, 10);
  block.dataset.activeSlide = slideIndex;

  const slides = block.querySelectorAll('.carousel-gallery-slide');

  slides.forEach((aSlide, idx) => {
    aSlide.setAttribute('aria-hidden', idx !== slideIndex);
    aSlide.querySelectorAll('a').forEach((link) => {
      if (idx !== slideIndex) {
        link.setAttribute('tabindex', '-1');
      } else {
        link.removeAttribute('tabindex');
      }
    });
  });

  const indicators = block.querySelectorAll('.carousel-gallery-slide-indicator');
  indicators.forEach((indicator, idx) => {
    if (idx !== slideIndex) {
      indicator.querySelector('button').removeAttribute('aria-current');
    } else {
      indicator.querySelector('button').setAttribute('aria-current', true);
    }
  });

  // Update button states (unless we're in initialization)
  if (!skipButtonUpdate) {
    updateButtonStates(block);
  }
}

function showSlide(block, slideIndex = 0) {
  const slides = block.querySelectorAll('.carousel-gallery-slide');
  let realSlideIndex = slideIndex < 0 ? slides.length - 1 : slideIndex;
  if (slideIndex >= slides.length) realSlideIndex = 0;
  const activeSlide = slides[realSlideIndex];

  activeSlide.querySelectorAll('a').forEach((link) => link.removeAttribute('tabindex'));
  block.querySelector('.carousel-gallery-slides-container').scrollTo({
    top: 0,
    left: activeSlide.offsetLeft,
    behavior: 'smooth',
  });
}

function updateButtonStates(block) {
  const container = block.querySelector('.carousel-gallery-slides-container');
  const prevButton = block.querySelector('.slide-prev');
  const nextButton = block.querySelector('.slide-next');

  if (prevButton) prevButton.disabled = container.scrollLeft <= 0;
  if (nextButton) {
    const maxScroll = container.scrollWidth - container.clientWidth;
    nextButton.disabled = container.scrollLeft >= maxScroll - 1;
  }
}

function bindEvents(block) {
  const slideIndicators = block.querySelector('.carousel-gallery-slide-indicators');
  if (!slideIndicators) return;

  slideIndicators.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', (e) => {
      const slideIndicator = e.currentTarget.parentElement;
      showSlide(block, parseInt(slideIndicator.dataset.targetSlide, 10));
    });
  });

  block.querySelector('.slide-prev').addEventListener('click', () => {
    const container = block.querySelector('.carousel-gallery-slides-container');
    const slideWidth = block.querySelector('.carousel-gallery-slide').offsetWidth;
    container.scrollBy({
      left: -slideWidth,
      behavior: 'smooth',
    });
  });
  block.querySelector('.slide-next').addEventListener('click', () => {
    const container = block.querySelector('.carousel-gallery-slides-container');
    const slideWidth = block.querySelector('.carousel-gallery-slide').offsetWidth;
    container.scrollBy({
      left: slideWidth,
      behavior: 'smooth',
    });
  });

  const container = block.querySelector('.carousel-gallery-slides-container');

  // Update button states on scroll
  container.addEventListener('scroll', () => {
    updateButtonStates(block);
  });

  const slideObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      // Only update if user has scrolled (not at scroll position 0)
      if (entry.isIntersecting && container.scrollLeft > 0) {
        updateActiveSlide(entry.target);
      }
    });
  }, { threshold: 0.5 });
  block.querySelectorAll('.carousel-gallery-slide').forEach((slide) => {
    slideObserver.observe(slide);
  });
}

function createSlide(row, slideIndex, carouselId) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', `carousel-gallery-${carouselId}-slide-${slideIndex}`);
  slide.classList.add('carousel-gallery-slide');

  row.querySelectorAll(':scope > div').forEach((column, idx) => {
    column.classList.add(`carousel-gallery-slide-${idx === 0 ? 'image' : 'content'}`);
    slide.append(column);
  });

  const labeledBy = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (labeledBy) {
    slide.setAttribute('aria-labelledby', labeledBy.getAttribute('id'));
  }

  return slide;
}

let carouselId = 0;
export default function decorate(block) {
  carouselId += 1;
  block.setAttribute('id', `carousel-gallery-${carouselId}`);
  const rows = block.querySelectorAll(':scope > div');
  const isSingleSlide = rows.length < 2;

  const placeholders = {};
  if (!isSingleSlide) {
    block.setAttribute('role', 'group');
    block.setAttribute('aria-roledescription', 'carousel');
  }

  const container = document.createElement('div');
  container.classList.add('carousel-gallery-slides-container');

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-gallery-slides');
  block.prepend(slidesWrapper);

  let slideIndicators;
  if (!isSingleSlide) {
    const slideIndicatorsNav = document.createElement('nav');
    slideIndicatorsNav.setAttribute('aria-label', placeholders.slideControls || 'Carousel Slide Controls');
    slideIndicators = document.createElement('ol');
    slideIndicators.classList.add('carousel-gallery-slide-indicators');
    slideIndicatorsNav.append(slideIndicators);
    block.append(slideIndicatorsNav);

    const slideNavButtons = document.createElement('div');
    slideNavButtons.classList.add('carousel-gallery-navigation-buttons');
    slideNavButtons.innerHTML = `
      <button type="button" class= "slide-prev" aria-label="${placeholders.previousSlide || 'Previous Slide'}"></button>
      <button type="button" class="slide-next" aria-label="${placeholders.nextSlide || 'Next Slide'}"></button>
    `;

    block.append(slideNavButtons);
  }

  rows.forEach((row, idx) => {
    const slide = createSlide(row, idx, carouselId);
    slidesWrapper.append(slide);

    if (slideIndicators) {
      const indicator = document.createElement('li');
      indicator.classList.add('carousel-gallery-slide-indicator');
      indicator.dataset.targetSlide = idx;
      indicator.innerHTML = `<button type="button"><span>${placeholders.showSlide || 'Show Slide'} ${idx + 1} ${placeholders.of || 'of'} ${rows.length}</span></button>`;
      slideIndicators.append(indicator);
    }
    row.remove();
  });

  container.append(slidesWrapper);
  block.prepend(container);

  if (!isSingleSlide) {
    bindEvents(block);
    block.dataset.activeSlide = 0;
    const firstSlide = slidesWrapper.querySelector('.carousel-gallery-slide');
    if (firstSlide) {
      updateActiveSlide(firstSlide, true);
    }

    // Update button states after layout is complete
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updateButtonStates(block);
        });
      });
    });
  }
}
