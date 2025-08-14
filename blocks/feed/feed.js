import {
  buildBlock, createOptimizedPicture, loadBlock, decorateIcons, decorateButtons,
} from '../../scripts/aem.js';
import { createTag } from '../../libs/utils/utils.js';
import { formatCardLocaleDate } from './feed-helper.js';
import { getTaxonomyCategory } from '../../scripts/taxonomy.js';

let queryIndexEndpoint;
let pager = 1;
let limit = 7;
let feedItems = [];
let ctaLabel = 'Read >';
let pagerLabel = 'Load More';

let categoryType;
let selectedCategory;
const categoryMap = {};
const categories = [];

let featuredCard = 2;
let dateAllowed = true;

async function fetchData() {
  const response = await fetch(queryIndexEndpoint);
  if (!response.ok) return;
  const data = await response.json();

  // used for ordering
  categories.forEach((category) => {
    if (!categoryMap[category]) {
      categoryMap[category] = [];
    }
  });

  data.data.forEach((dataItem) => {
    if (dataItem.category) {
      // multiple categories
      if (dataItem.category.includes(',')) {
        const splitCategories = dataItem.category.split(',');
        splitCategories.forEach((category) => {
          if (categoryMap[category.trim()]) {
            categoryMap[category.trim()].push(dataItem);
          }
        });
        return;
      }

      if (categoryMap[dataItem.category]) {
        categoryMap[dataItem.category].push(dataItem);
      }
    }
  });

  // sort by date
  Object.keys(categoryMap).forEach((category) => {
    categoryMap[category].sort((a, b) => {
      const dateA = a.date ?? a.lastModified;
      const dateB = b.date ?? b.lastModified;
      
      // Handle empty dates - put them at the end
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      
      // Parse dates properly
      let parsedDateA, parsedDateB;
      
      // Handle Unix timestamps (numbers > 1000000000)
      if (typeof dateA === 'number' && dateA > 1000000000) {
        parsedDateA = new Date(dateA * 1000);
      } else if (typeof dateA === 'number') {
        // Excel date number (smaller numbers)
        parsedDateA = new Date(Math.round((dateA - (1 + 25567 + 1)) * 86400 * 1000));
      } else {
        parsedDateA = new Date(dateA);
      }
      
      if (typeof dateB === 'number' && dateB > 1000000000) {
        parsedDateB = new Date(dateB * 1000);
      } else if (typeof dateB === 'number') {
        // Excel date number (smaller numbers)
        parsedDateB = new Date(Math.round((dateB - (1 + 25567 + 1)) * 86400 * 1000));
      } else {
        parsedDateB = new Date(dateB);
      }
      
      // Handle invalid dates
      if (isNaN(parsedDateA.getTime()) && isNaN(parsedDateB.getTime())) return 0;
      if (isNaN(parsedDateA.getTime())) return 1;
      if (isNaN(parsedDateB.getTime())) return -1;
      
      return parsedDateB - parsedDateA;
    });
  });

  // remove empty categories
  Object.keys(categoryMap).forEach((category) => {
    if (categoryMap[category].length === 0) {
      delete categoryMap[category];
    }
  });
}

function updateFeedItems(block, end = pager * limit) {
  feedItems = categoryMap[selectedCategory].slice(0, end);

  const loadMoreButtonElement = block.closest('.section').querySelector('.load-more');
  if (!loadMoreButtonElement) return;

  if (feedItems.length >= categoryMap[selectedCategory].length) {
    loadMoreButtonElement.style.display = 'none';
  } else {
    loadMoreButtonElement.style.display = 'block';
  }
}

async function loadMoreFeedItems(block) {
  pager += 1;
  const end = featuredCard ? (pager * (limit + 1)) - 1 : pager * limit;
  updateFeedItems(block, end);
}

function setFeaturedCard(block) {
  if (featuredCard === 0) return;
  block.querySelector(`:scope > ul > li:nth-child(${featuredCard})`).classList.add('featured-card');
}

async function buildCards(block) {
  const cardBlock = [];

  feedItems.forEach((item, index) => {
    function getValidSource(...sources) {
      return sources.find((src) => src && src !== '0');
    }

    function chooseImage(sources) {
      const validSource = getValidSource(...sources);
      return validSource ? createOptimizedPicture(validSource, item.imageAlt) : null;
    }

    const validSources = [item.image, item.mobileImage, item.tabletImage].filter((src) => src && src !== '0');

    const countMap = {
      1: 'one',
      2: 'two',
      3: 'three',
    };
    const imagesCount = validSources.length;
    const countClass = countMap[imagesCount] ?? 'one';

    const desktopImageElement = chooseImage([item.image, item.mobileImage, item.tabletImage]);
    const imageElement = chooseImage([item.mobileImage, item.image, item.tabletImage]);
    const tabletImageElement = chooseImage([item.tabletImage, item.mobileImage, item.image]);

    const firstCol = createTag(
      'div',
      { class: `${countClass}-image-available` },
      [imageElement, tabletImageElement, desktopImageElement],
    );

    const heading = createTag('p', { class: 'card-title' }, `<strong>${item.heading}</strong>`);
    const description = createTag('p', { class: 'card-description' }, item.description);

    const link = createTag('a', { href: item.path }, ctaLabel);
    const secondaryLink = createTag('em', { class: 'button-container' }, link);
    const linkWrapper = createTag('p', null, secondaryLink);

    const secondCol = createTag('div', { class: 'card-body-inner-wrapper' }, [heading, description, linkWrapper]);

    if (dateAllowed) {
      const date = item.date ?? item.lastModified;
      const dateElement = createTag('p', { class: 'card-date' }, formatCardLocaleDate(date));
      secondCol.prepend(dateElement);
    }

    cardBlock[index] = [firstCol, secondCol];
  });

  const card = buildBlock('cards', cardBlock);
  card.dataset.blockName = 'cards';
  decorateButtons(card);
  decorateIcons(card);
  const loadedCard = await loadBlock(card);
  loadedCard.classList.add('rounded', 'block', 'gap-sm');
  block.innerHTML = loadedCard.innerHTML;
  block.classList.add(...loadedCard.classList);

  setFeaturedCard(block);
}

function buildPager(block) {
  const loadMoreButton = createTag('button', { class: 'load-more' }, pagerLabel);
  loadMoreButton.addEventListener('click', async () => {
    await loadMoreFeedItems(block);
    await buildCards(block);
  });
  const loadMoreButtonWrapper = createTag('div', { class: 'load-more-wrapper' }, loadMoreButton);
  block.insertAdjacentElement('afterend', loadMoreButtonWrapper);
}

async function setCategories() {
  const taxCategory = await getTaxonomyCategory(categoryType);
  Object.keys(taxCategory).forEach((key) => {
    if (typeof taxCategory[key] === 'object') {
      categories.push(key);
    }
  });

  [selectedCategory] = categories;
}

async function buildCategory(block) {
  const orderedCategories = Object.keys(categoryMap);
  const listItems = orderedCategories.map((category) => {
    const button = createTag('button', { class: 'feed-tab' }, category);
    const listItem = createTag('li', { class: 'feed-tab-item', role: 'tab' }, button);
    button.addEventListener('click', async () => {
      pager = 1;
      selectedCategory = category;
      updateFeedItems(block);
      await buildCards(block);

      listItem.classList.add('active');
      listItem.parentElement.childNodes.forEach((item) => {
        if (item !== listItem) {
          item.classList.remove('active');
        }
      });
    });
    return listItem;
  });

  listItems[0].classList.add('active');
  const ul = createTag('ul', { class: 'feed-tabs-list-desktop', role: 'tablist' }, listItems);

  const select = createTag('select', { class: 'feed-tabs-select-mobile' }, orderedCategories.map((category) => {
    const option = createTag('option', { value: category }, category);
    return option;
  }));

  select.addEventListener('change', async (event) => {
    pager = 1;
    selectedCategory = event.target.value;
    updateFeedItems(block);
    await buildCards(block);
  });

  const tabs = createTag('div', { class: 'feed-tabs' }, [ul, select]);

  const section = createTag('div', { class: 'section feed-tabs-wrapper', 'data-section-status': 'loaded' }, tabs);
  const newSectionOuter = createTag('div', { class: 'section-outer feed-tabs', 'data-section-status': 'loaded' }, section);
  const sectionOuter = block.closest('.section-outer');
  sectionOuter.insertAdjacentElement('beforebegin', newSectionOuter);
}

export default async function init(block) {
  const { children } = block;
  Array.from(children).forEach((child) => {
    const key = child.children[0].textContent?.toLowerCase().replace(/\s/g, '-');
    let value;

    switch (key) {
      case 'path':
        value = child.children[1].textContent;
        queryIndexEndpoint = new URL(value)?.pathname;
        break;
      case 'category-type':
        value = child.children[1].textContent;
        categoryType = value;
        break;
      case 'limit':
        value = child.children[1].textContent;
        limit = parseInt(value, 10);
        break;
      case 'featured-card':
        value = child.children[1].textContent;
        featuredCard = parseInt(value, 10);
        break;
      case 'date':
        value = child.children[1].textContent.toLowerCase();
        dateAllowed = value === 'true' || value === 'yes';
        break;
      case 'cta-label':
        ctaLabel = child.children[1].textContent.trim();
        break;
      case 'pager-label':
        pagerLabel = child.children[1].textContent.trim();
        break;
      default:
        break;
    }
  });

  if (!queryIndexEndpoint || !categoryType) return;

  await setCategories();
  await fetchData();
  await buildCategory(block);
  updateFeedItems(block);
  await buildCards(block);
  buildPager(block);
}
