// Shared block decorate functions

import { createTag } from './utils.js';

/**
 * Checks if a hex color value is dark or light
 *
 * @param {string} color - Hex color value
 */
export function isDarkHexColor(color) {
  const hexColor = (color.charAt(0) === '#') ? color.substring(1, 7) : color;
  const r = parseInt(hexColor.substring(0, 2), 16); // hexToR
  const g = parseInt(hexColor.substring(2, 4), 16); // hexToG
  const b = parseInt(hexColor.substring(4, 6), 16); // hexToB
  return ((r * 0.299) + (g * 0.587) + (b * 0.114)) <= 186;
}

/**
 * Checks if a given URL points to an image file.
 *
 * @param {string} url - The URL to check.
 * @returns {boolean} - Returns `true` if the URL points to an image file, otherwise `false`.
 */
export function isImagePath(url) {
  if (!url) return false;
  const urlWithoutParams = url.split('?')[0];
  return /\.(jpg|jpeg|png|gif|bmp|svg|webp)$/i.test(urlWithoutParams);
}

/**
 * Decorates buttons within a given element by adding
 * appropriate classes based on their parent elements.
 *
 * The function searches for buttons within the provided element that
 * match the selectors 'em a', 'strong a', and 'p > a strong'.
 * It then assigns classes to these buttons based on their parent elements
 * and any custom classes found in the button text.
 *
 * @param {HTMLElement} el - container element
 */
export function decorateButtons(el) {
  const buttons = el.querySelectorAll('em a, strong a, p > a strong');
  if (buttons.length === 0) return;
  const buttonTypeMap = { STRONG: 'primary', EM: 'secondary', A: 'link' };
  buttons.forEach((button) => {
    const parent = button.parentElement;
    const buttonType = buttonTypeMap[parent.nodeName] || 'primary';
    button.classList.add('button', buttonType);

    const customClasses = button.textContent && [...button.textContent.matchAll(/#_button-([a-zA-Z-]+)/g)];
    if (customClasses) {
      customClasses.forEach((match) => {
        button.textContent = button.textContent.replace(match[0], '');
        button.classList.add(match[1]);
      });
    }
  });
  // remove wrapping tags and add button-container class to parent p
  el.querySelectorAll('p > strong, p > em').forEach((btn) => {
    if (!btn.querySelector('a')) return;
    const parentP = btn.parentElement;
    btn.querySelectorAll('a').forEach((a) => parentP.appendChild(a));
    btn.remove();
    parentP.classList.add('button-container');
  });
}

/**
 * Adjusts the focal point of an image within a picture element
 * based on the provided child element's content.
 *
 * @param {HTMLElement} pic - The picture element containing the image.
 * @param {HTMLElement} child - The child element containing focal point data.
 * @param {boolean} removeChild - Flag indicating whether to remove the child element
 * or its text nodes after processing.
 */
export function handleFocalpoint(pic, child, removeChild) {
  const image = pic.querySelector('img');
  if (!child || !image) return;
  let text = '';
  if (child.childElementCount === 2) {
    const dataElement = child.querySelectorAll('p')[1];
    text = dataElement?.textContent;
    if (removeChild) dataElement?.remove();
  } else if (child.textContent) {
    text = child.textContent;
    const childData = child.childNodes;
    if (removeChild) childData.forEach((c) => c.nodeType === Node.TEXT_NODE && c.remove());
  }
  if (!text) return;
  const directions = text.trim().toLowerCase().split(',');
  const [x, y = ''] = directions;
  image.style.objectPosition = `${x} ${y}`;
}

/**
 * Decorates a block background by adding classes and handling focal points for images or videos.
 *
 * @param {HTMLElement} block - The block element to decorate.
 * @param {HTMLElement} node - The node containing child elements to be processed.
 * @param {Object} [options] - Optional settings.
 * @param {boolean} [options.useHandleFocalpoint=false] - Whether to handle focal points for images.
 * @param {string} [options.className='background'] - The class name to add to the node.
 * @returns {Promise<void>} A promise that resolves when the decoration is complete.
 */
export async function decorateBlockBg(block, node, { useHandleFocalpoint = false, className = 'background' } = {}) {
  const childCount = node.childElementCount;
  if (node.querySelector('img, video') || childCount > 1) {
    node.classList.add(className);
    const twoVP = [['mobile-only'], ['tablet-only', 'desktop-only']];
    const threeVP = [['mobile-only'], ['tablet-only'], ['desktop-only']];
    const viewports = childCount === 2 ? twoVP : threeVP;
    [...node.children].forEach((child, i) => {
      if (childCount > 1) child.classList.add(...viewports[i]);
      const pic = child.querySelector('picture');
      if (useHandleFocalpoint && pic
        && (child.childElementCount === 2 || child.textContent?.trim())) {
        handleFocalpoint(pic, child, true);
      }
    });
  } else {
    block.style.background = node.textContent;
    node.remove();
  }
}

/**
 * Decorates a section element with grid classes based on metadata.
 *
 * @param {HTMLElement} section - The section element to be decorated.
 * @param {string} meta - A comma-separated string of class names to
 * be applied to the section's rows.
 */
export function decorateGridSection(section, meta) {
  section.classList.add('grid-section');
  const gridValues = meta.split(',').map((val) => val.trim().toLowerCase());
  let rowCount = 0;
  let autoGrid = false;
  Array.from(section.querySelectorAll('.section > div'))
    .filter((row) => {
      const firstCol = row.querySelector(':scope > div');
      if (firstCol && firstCol.classList.contains('library-metadata')) row.classList.add('span-12');
      return !firstCol?.classList.contains('section-metadata') && !firstCol?.classList.contains('library-metadata');
    })
    .forEach((row, i) => {
      if (gridValues[i]) {
        row.classList.add(gridValues[i]);
      }
      // if single span-auto row, add span-auto class to all rows
      if (gridValues[0] === 'span-auto' && gridValues.length === 1) {
        row.classList.add('span-auto');
        autoGrid = true;
      }
      rowCount += 1;
    });
  if (autoGrid) { section.classList.add(`grid-template-columns-${rowCount}-auto`); }
}

export function decorateGridSectionGroups(section, meta) {
  const sectionRows = [];
  let currentDiv = document.createElement('div');
  sectionRows.push(currentDiv);

  [...section.children].forEach((child) => {
    if (child.querySelector('.section-metadata')) return;
    if (child.querySelector('.separator')) {
      currentDiv = document.createElement('div');
      sectionRows.push(currentDiv);
      child.remove();
    } else {
      currentDiv.append(child);
    }
  });
  const gridValues = meta.split(',').map((val) => val.trim().toLowerCase());
  let rowCount = 0;
  let autoGrid = false;
  section.classList.add('grid-section');
  const gridRows = [...sectionRows];
  gridRows.forEach((row, i) => {
    // for each direct child of the row, unwrap it if it doesn't have a class
    const rowChildren = [...row.children];
    rowChildren.forEach((child) => {
      if (child.classList.length === 0) {
        child.replaceWith(...child.childNodes);
      }
    });
    if (gridValues[i]) row.classList.add(gridValues[i]);
    // if single span-auto row, add span-auto class to all rows
    if (gridValues[0] === 'span-auto' && gridValues.length === 1) {
      row.classList.add('span-auto');
      autoGrid = true;
    }
    rowCount += 1;
  });

  section.append(...gridRows);
  if (autoGrid) { section.classList.add(`grid-template-columns-${rowCount}-auto`); }
}

function updateActiveSlide(steps, pagination) {
  const dots = pagination.querySelectorAll('button');
  function handleIntersection(entries) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const visibleStep = entry.target;
        const index = Array.from(steps).indexOf(visibleStep);
        dots.forEach((dot) => dot.classList.remove('active'));
        dots[index].classList.add('active');
      }
    });
  }
  // Create observer with 50% visibility threshold
  const observer = new IntersectionObserver(handleIntersection, { threshold: 0.5 });
  steps.forEach((step) => observer.observe(step)); // Start observing each step
}

export function initSlider(block, slides, container = null) {
  if (!slides) return;
  const slideContainer = container || block;
  slideContainer.classList.add('slider-container');
  const pagination = createTag('div', { class: 'pagination' }, null);
  slides.forEach((slide, i) => {
    slide.id = `slide-${i}`;
    slide.classList.add('slide');
    const dot = createTag('button', { type: 'button', class: `dot dot-slide-${i}`, 'aria-label': `Slide ${i + 1}` }, null);
    pagination.append(dot);

    // scroll into view on click
    slide.addEventListener('click', () => {
      slide.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    dot.addEventListener('click', (event) => {
      event.preventDefault();
      slide.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
  const { blockName } = block.dataset;
  const outerSection = block.closest(`.${blockName}-wrapper`);
  outerSection.classList.add('slider-wrapper');
  outerSection.append(pagination);
  updateActiveSlide(slides, pagination);
}
