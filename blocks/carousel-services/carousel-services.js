function updateActiveSlide(slide) {
  const block = slide.closest('.carousel-services');
  const slideIndex = parseInt(slide.dataset.slideIndex, 10);
  block.dataset.activeSlide = slideIndex;

  const slides = block.querySelectorAll('.carousel-services-slide');

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

  const indicators = block.querySelectorAll('.carousel-services-slide-indicator');
  indicators.forEach((indicator, idx) => {
    if (idx !== slideIndex) {
      indicator.querySelector('button').removeAttribute('disabled');
    } else {
      indicator.querySelector('button').setAttribute('disabled', 'true');
    }
  });
}

export function showSlide(block, slideIndex = 0) {
  const slides = block.querySelectorAll('.carousel-services-slide');
  let realSlideIndex = slideIndex < 0 ? slides.length - 1 : slideIndex;
  if (slideIndex >= slides.length) realSlideIndex = 0;
  const activeSlide = slides[realSlideIndex];

  activeSlide.querySelectorAll('a').forEach((link) => link.removeAttribute('tabindex'));
  block.querySelector('.carousel-services-slides').scrollTo({
    top: 0,
    left: activeSlide.offsetLeft,
    behavior: 'smooth',
  });
}

function bindEvents(block) {
  const slideIndicators = block.querySelector('.carousel-services-slide-indicators');
  if (!slideIndicators) return;

  slideIndicators.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', (e) => {
      const slideIndicator = e.currentTarget.parentElement;
      showSlide(block, parseInt(slideIndicator.dataset.targetSlide, 10));
    });
  });

  const slideObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) updateActiveSlide(entry.target);
    });
  }, { threshold: 0.5 });
  block.querySelectorAll('.carousel-services-slide').forEach((slide) => {
    slideObserver.observe(slide);
  });
}

function createSlide(row, slideIndex, carouselId) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', `carousel-services-${carouselId}-slide-${slideIndex}`);
  slide.classList.add('carousel-services-slide');

  // For 3-column layout: [intro text, image, content text]
  // Note: First row will have 2 columns after intro is extracted
  const columns = row.querySelectorAll(':scope > div');

  if (columns.length === 3) {
    // Column 0: intro text (only used in first row, or empty)
    // Column 1: image
    // Column 2: content text
    columns[1].classList.add('carousel-services-slide-image');
    columns[2].classList.add('carousel-services-slide-content');

    // Split content on double line breaks to separate heading from body text
    const paragraphs = columns[2].querySelectorAll('p');
    paragraphs.forEach((p) => {
      const html = p.innerHTML;
      // Split on <br><br> to separate heading from body
      const parts = html.split(/<br\s*\/?>\s*<br\s*\/?>/i);
      if (parts.length > 1) {
        p.innerHTML = '';

        // Create heading for first part
        const heading = document.createElement('p');
        heading.className = 'carousel-services-heading';
        heading.innerHTML = parts[0];
        p.appendChild(heading);

        // Create body paragraphs for remaining parts
        for (let i = 1; i < parts.length; i++) {
          const bodyP = document.createElement('p');
          bodyP.className = 'carousel-services-body';
          bodyP.innerHTML = parts[i];
          p.appendChild(bodyP);
        }
      }
    });

    slide.append(columns[1]);
    slide.append(columns[2]);
  } else if (columns.length === 2) {
    // First row after intro extraction: [image, content text]
    // Column 0: image
    // Column 1: content text
    columns[0].classList.add('carousel-services-slide-image');
    columns[1].classList.add('carousel-services-slide-content');

    // Split content on double line breaks to separate heading from body text
    const paragraphs = columns[1].querySelectorAll('p');
    paragraphs.forEach((p) => {
      const html = p.innerHTML;
      // Split on <br><br> to separate heading from body
      const parts = html.split(/<br\s*\/?>\s*<br\s*\/?>/i);
      if (parts.length > 1) {
        p.innerHTML = '';

        // Create heading for first part
        const heading = document.createElement('p');
        heading.className = 'carousel-services-heading';
        heading.innerHTML = parts[0];
        p.appendChild(heading);

        // Create body paragraphs for remaining parts
        for (let i = 1; i < parts.length; i++) {
          const bodyP = document.createElement('p');
          bodyP.className = 'carousel-services-body';
          bodyP.innerHTML = parts[i];
          p.appendChild(bodyP);
        }
      }
    });

    slide.append(columns[0]);
    slide.append(columns[1]);
  }

  const labeledBy = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (labeledBy) {
    slide.setAttribute('aria-labelledby', labeledBy.getAttribute('id'));
  }

  return slide;
}

let carouselId = 0;
export default function decorate(block) {
  carouselId += 1;
  block.setAttribute('id', `carousel-services-${carouselId}`);
  const rows = block.querySelectorAll(':scope > div');

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Carousel');

  const container = document.createElement('div');
  container.classList.add('carousel-services-slides-container');

  // Extract intro content from first row (first column)
  const introContent = rows[0].querySelector(':scope > div:first-child');
  if (introContent) {
    introContent.classList.add('carousel-services-intro');

    // Process intro text to add heading class
    const introParagraphs = introContent.querySelectorAll('p');
    if (introParagraphs.length > 0) {
      const firstP = introParagraphs[0];
      const html = firstP.innerHTML;
      const parts = html.split(/<br\s*\/?>\s*<br\s*\/?>/i);
      if (parts.length > 1) {
        firstP.innerHTML = '';

        // Create intro heading
        const heading = document.createElement('p');
        heading.className = 'carousel-services-intro-heading';
        heading.innerHTML = parts[0];
        firstP.appendChild(heading);

        // Create intro body
        for (let i = 1; i < parts.length; i++) {
          const bodyP = document.createElement('p');
          bodyP.className = 'carousel-services-intro-body';
          bodyP.innerHTML = parts[i];
          firstP.appendChild(bodyP);
        }
      }
    }

    container.append(introContent);
  }

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-services-slides');

  const slideCount = rows.length;
  let slideIndicators;
  if (slideCount > 1) {
    const slideIndicatorsNav = document.createElement('nav');
    slideIndicatorsNav.setAttribute('aria-label', 'Carousel Slide Controls');
    slideIndicators = document.createElement('ol');
    slideIndicators.classList.add('carousel-services-slide-indicators');
    slideIndicatorsNav.append(slideIndicators);
    block.append(slideIndicatorsNav);
  }

  rows.forEach((row, idx) => {
    const slide = createSlide(row, idx, carouselId);
    slidesWrapper.append(slide);

    if (slideIndicators) {
      const indicator = document.createElement('li');
      indicator.classList.add('carousel-services-slide-indicator');
      indicator.dataset.targetSlide = idx;
      indicator.innerHTML = `<button type="button" aria-label="Show Slide ${idx + 1} of ${slideCount}"></button>`;
      slideIndicators.append(indicator);
    }
    row.remove();
  });

  container.append(slidesWrapper);
  block.prepend(container);

  if (slideCount > 1) {
    bindEvents(block);
  }
}
