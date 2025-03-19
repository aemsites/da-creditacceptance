import { createOptimizedPicture, loadCSS } from '../../scripts/aem.js';
import { createTag } from '../../libs/utils/utils.js';
import { initSlider } from '../../libs/utils/decorate.js';

const isDesktop = window.matchMedia('(min-width: 960px)');

export function isDateValid(dateStr) {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.length > 18) return false;

  // eslint-disable-next-line no-restricted-globals
  return !isNaN(new Date(dateStr));
}

function decorateDate(data) {
  if (!data) return;

  if (Array.from(data)) {
    data.forEach((p) => {
      if (isDateValid(p.textContent)) {
        p.classList.add('date');
        p.closest('.cards-card-body')?.classList.add('has-date');
      }
    });
  }
}

function addMobileSlider(block) {
  const isSlider = block.classList.contains('slider-mobile');
  if (isSlider && !isDesktop.matches) {
    const sliderContainer = block.querySelector('ul');
    const slides = sliderContainer.querySelectorAll(':scope > li');
    loadCSS(`${window.hlx.codeBasePath}/blocks/slider/slider.css`);
    initSlider(block, slides, sliderContainer);
  }
}

function decoratePictures(cell) {
  const pictures = cell.querySelectorAll('picture');

  const classes = ['mobile', 'tablet', 'desktop'];
  pictures.forEach((picture, index) => {
    const img = picture.querySelector('img');
    const optimizedPicture = createOptimizedPicture(img.src, img.alt);
    optimizedPicture.classList.add(`card-image-${classes[index]}`);
    const link = picture.parentNode.querySelector('a');
    if (picture.parentNode.tagName === 'P') {
      if (link) {
        link.innerHTML = '';
        link.append(optimizedPicture);
        picture.parentNode.replaceWith(link);
      } else {
        picture.parentNode.replaceWith(optimizedPicture);
      }
    } else {
      picture.replaceWith(optimizedPicture);
    }
  });

  switch (pictures.length) {
    case 1:
      cell.classList.add('one-image');
      break;

    case 2:
      cell.classList.add('two-images');
      break;

    case 3:
      cell.classList.add('three-images');
      break;
    default:
      break;
  }
}

export default function decorate(block) {
  const isAnimated = block.classList.contains('animation') && !block.classList.contains('animation-none');
  const ul = createTag('ul');
  const resourcesType = block.classList.contains('resources');
  [...block.children].forEach((row) => {
    const li = createTag('li');
    if (isAnimated) li.classList.add('animation-scale');
    const cardWrapper = createTag('div', { class: 'card-wrapper' });
    let cardIntro = null;
    while (row.firstElementChild) cardWrapper.append(row.firstElementChild);
    [...cardWrapper.children].forEach((div) => {
      if (div.querySelector('picture')) {
        div.className = 'cards-card-image';
        decoratePictures(div);
      } else if (div.querySelector('.icon img') && div.children.length === 1) {
        div.className = 'cards-card-icon';
        const icon = div.querySelector('.icon img');
        const maskedDiv = createTag('div', { class: 'icon-masked', style: `mask-image :url(${icon.src})` });
        icon.parentNode.parentNode.replaceWith(maskedDiv);
      } else {
        div.className = 'cards-card-body';
        const cardheaders = div.querySelectorAll('h2, h3, h4, h5, h6');
        cardheaders.forEach((header, i) => {
          if (cardheaders.length > 1 && i === 0 && resourcesType) {
            cardIntro = header;
            cardIntro.classList.add('card-intro');
          } else {
            header?.classList.add('card-title');
          }
        });
        const paragraphs = div.querySelectorAll('p');
        decorateDate(paragraphs);

        const link = div.querySelector('a');
        if (link) {
          div.classList.add('ellipsed');
        }
      }
    });
    if (cardIntro) li.append(cardIntro);
    li.append(cardWrapper);
    ul.append(li);
  });

  block.textContent = '';
  block.append(ul);

  if (block.classList.contains('careers')) {
    block.classList.add('rounded');
  }

  addMobileSlider(block);
}
