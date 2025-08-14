import { loadFragment } from '../fragment/fragment.js';
import { createTag } from '../../libs/utils/utils.js';

function expandAccordionItem() {
  const { hash } = window.location;
  if (hash) {
    const element = document.querySelector(hash);
    if (element) {
      element.scrollIntoView();
      const accordionItem = element.closest('.accordion-item');
      if (accordionItem) {
        accordionItem.open = true;
      }
    }
  }
}

function getExpandIndex(element) {
  const match = [...element.classList].find((cls) => cls.startsWith('expand-'))?.match(/^expand-(\d+)$/);
  return match ? (match[1] - 1) : null;
}

function decorate(block) {
  const openIndex = getExpandIndex(block);
  [...block.children].forEach((row, i) => {
    const label = row.children[0];
    const summary = createTag('summary', { class: 'accordion-item-label' }, [...label.childNodes]);
    const plus = createTag('span', { class: 'accordion-item-plus' }, '+');
    const minus = createTag('span', { class: 'accordion-item-minus' }, '-');
    summary.prepend(plus, minus);

    const body = row.children[1];
    body.className = 'accordion-item-body';
    const detailsAttrs = { class: 'accordion-item' };
    if (openIndex !== null && openIndex === i) detailsAttrs.open = 'true';
    const details = createTag('details', detailsAttrs, [summary, body]);
    row.replaceWith(details);
  });
}

function rearrangeSectionContents(section) {
  Array.from(section.children).forEach((child) => {
    if (!child?.classList.contains('default-content-wrapper')) {
      child.previousElementSibling?.append(child);
    } else if (child?.classList.contains('default-content-wrapper') && !child?.firstElementChild.matches('h2,h3,h4,h5,h6')) {
      const contents = [child.firstElementChild];
      let nextElement = child.firstElementChild?.nextElementSibling;

      while (nextElement && !nextElement.matches('h3,h4,h5,h6')) {
        contents.push(nextElement);
        nextElement = nextElement.nextElementSibling;
      }
      child.previousElementSibling?.append(...contents);

      if (child.children.length === 0) {
        child.remove();
      }
    }
  });
}

function buildAccordionSection(section) {
  rearrangeSectionContents(section);
  var defaultContentWrapper;
  const heading = section.querySelector('h1,h2');
  if (heading) {
    defaultContentWrapper = createTag('div', { class: 'default-content-wrapper' }, heading);
  }
  const accordion = createTag('div', { class: 'accordion faqs block', 'data-block-name': 'accordion' });
  const accordionWrapper = createTag('div', { class: 'accordion-wrapper' }, accordion);

  const accordionItemLabels = Array.from(section.querySelectorAll('h3,h4,h5,h6'));
  accordionItemLabels.forEach((label) => {
    let content = label.nextElementSibling;
    const contentElements = [];
    while (content && !accordionItemLabels.includes(content)) {
      contentElements.push(content);
      content = content.nextElementSibling;
    }
    const accordionItemLabelCol = createTag('div', null, [label]);
    const accordionItemContentCol = createTag('div', null, [...contentElements]);
    const accordionItemRow = createTag('div', null, [accordionItemLabelCol, accordionItemContentCol]);

    accordion.append(accordionItemRow);

    accordion.dataset.blockStatus = 'loaded';
  });

  section.innerHTML = '';
  if (defaultContentWrapper) {
    section.append(defaultContentWrapper, accordionWrapper);
  } else {
    section.append(accordionWrapper);
  }
}

async function decorateFAQs(block) {
  const fragment = block.querySelector('a');
  if (!fragment) return;

  const path = fragment.getAttribute('href');
  // loadFragment returns an element or a null
  const content = await loadFragment(path);
  // this will probably throw for a null content
  const fragmentSection = content && content.querySelector('.section');

  if (!fragmentSection) return;

  buildAccordionSection(fragmentSection);
  fragmentSection.querySelectorAll('.accordion').forEach((accordion) => {
    accordion.classList.add(...block.classList);
    decorate(accordion);
  });

  const blockSection = block.closest('.section');
  blockSection.classList.add(...fragmentSection.classList);
  block.closest('.accordion-wrapper').replaceWith(...fragmentSection.childNodes);
  fragmentSection.remove();
}

async function decorateFragmentBody(block) {
  const fragments = block.querySelectorAll('a');
  if (!fragments) return;

  fragments.forEach(async (fragment) => {
    const path = fragment.getAttribute('href');
    const content = await loadFragment(path);
    const fragmentSection = content && content.querySelector('.section');
    if (!fragmentSection) return;
    const parentRow = fragment.closest('div');
    parentRow.replaceWith(fragmentSection);
    fragmentSection.classList.add('fragment-section', 'accordion-item-body');
  });
}

function addEventListener() {
  const existingListener = document.body.querySelector('.accordion-listener');
  if (!existingListener) {
    window.addEventListener('hashchange', () => expandAccordionItem());
    document.body.querySelector('.section:has(.accordion)')?.classList.add('accordion-listener');
  }
}

export default async function init(block) {
  if (block.classList.contains('faqs')) {
    await decorateFAQs(block);

    // should also check on first load
    expandAccordionItem();
    addEventListener();
    return;
  }

  if (block.classList.contains('fragments')) {
    await decorateFragmentBody(block);
  }
  decorate(block);
  expandAccordionItem();
  addEventListener();
}
