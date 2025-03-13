import {
  buildBlock,
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  loadSection,
  loadSections,
  decorateBlock,
  loadCSS,
} from './aem.js';

import { decorateButtons } from '../libs/utils/decorate.js';
import {
  loadPalette, createTag, isProductionEnvironment, getEnvConfig,
} from '../libs/utils/utils.js';

export const PRODUCTION_DOMAINS = ['www.creditacceptance.com'];

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
  document.dispatchEvent(new CustomEvent('fontsLoaded'));
}

/**
 * Attaches an event listener to the specified element that intercepts clicks on links
 * containing '/modals/' in their href attribute. When such a link is clicked, the default
 * action is prevented, and the modal specified by the link's href is opened.
 *
 * @param {HTMLElement} element - The DOM element to which the event listener is attached.
 */
function autolinkModals(element) {
  element.addEventListener('click', async (e) => {
    const origin = e.target.closest('a');

    if (origin && origin.href && origin.href.includes('/modals/')) {
      e.preventDefault();
      const { openModal } = await import(`${window.hlx.codeBasePath}/blocks/modal/modal.js`);
      openModal(origin.href);
    }
  });
}

// All .pdf and external links to open in a new tab
export function decorateExternalLinks(main) {
  main.querySelectorAll('a').forEach((a) => {
    const href = a.getAttribute('href');
    if (href) {
      const extension = href.split('.').pop().trim();
      const isExternal = !href.startsWith('/') && !href.startsWith('#');
      const isPDF = extension === 'pdf';
      const isCa = href.includes('www.creditacceptance.com');
      if ((isExternal && (!isCa || isPDF)) || isPDF) {
        a.setAttribute('target', '_blank');
      }
    }
  });
}

/**
 * Returns the true origin of the current page in the browser.
 * If the page is running in a iframe with srcdoc, the ancestor origin is returned.
 * @returns {String} The true origin
 */
export function getOrigin() {
  const { location } = window;
  return location.href === 'about:srcdoc' ? window.parent.location.origin : location.origin;
}

/**
 * Retrieves the content of metadata tags.
 * @param {string} name The metadata name (or property)
 * @param {Document} doc Document object to query for metadata. Defaults to the window's document
 * @returns {string} The metadata value(s)
 */
function getMetadata(name, doc = document) {
  const attr = name && name.includes(':') ? 'property' : 'name';
  const meta = [...doc.head.querySelectorAll(`meta[${attr}="${name}"]`)]
    .map((m) => m.content)
    .join(', ');
  return meta || '';
}

/**
 * Returns the true of the current page in the browser.mac
 * If the page is running in a iframe with srcdoc,
 * the ancestor origin + the path query param is returned.
 * @returns {String} The href of the current page or the href of the block running in the library
 */
export function getHref() {
  if (window.location.href !== 'about:srcdoc') return window.location.href;

  const { location: parentLocation } = window.parent;
  const urlParams = new URLSearchParams(parentLocation.search);
  return `${parentLocation.origin}${urlParams.get('path')}`;
}

/** moved from aem.js per https://github.com/adobe/franklin-sidekick-library#considerations-when-building-blocks-for-the-library
/**
 * Returns a picture element with webp and fallbacks
 * @param {string} src The image URL
 * @param {string} [alt] The image alternative text
 * @param {boolean} [eager] Set loading attribute to eager
 * @param {Array} [breakpoints] Breakpoints and corresponding params (eg. width)
 * @returns {Element} The picture element
 */
export function createOptimizedPicture(
  src,
  alt = '',
  eager = false,
  breakpoints = [{ media: '(min-width: 600px)', width: '2000' }, { width: '750' }],
) {
  const url = new URL(src, getHref());
  const picture = document.createElement('picture');
  const { pathname } = url;
  const ext = pathname.substring(pathname.lastIndexOf('.') + 1);

  // webp
  breakpoints.forEach((br) => {
    const source = document.createElement('source');
    if (br.media) source.setAttribute('media', br.media);
    source.setAttribute('type', 'image/webp');
    source.setAttribute('srcset', `${pathname}?width=${br.width}&format=webply&optimize=medium`);
    picture.appendChild(source);
  });

  // fallback
  breakpoints.forEach((br, i) => {
    if (i < breakpoints.length - 1) {
      const source = document.createElement('source');
      if (br.media) source.setAttribute('media', br.media);
      source.setAttribute('srcset', `${pathname}?width=${br.width}&format=${ext}&optimize=medium`);
      picture.appendChild(source);
    } else {
      const img = document.createElement('img');
      img.setAttribute('loading', eager ? 'eager' : 'lazy');
      img.setAttribute('alt', alt);
      picture.appendChild(img);
      img.setAttribute('src', `${pathname}?width=${br.width}&format=${ext}&optimize=medium`);
    }
  });

  return picture;
}

/**
 * check if link text is same as the href
 * @param {Element} link the link element
 * @returns {boolean} true or false
 */
export function linkTextIncludesHref(link) {
  const href = link.getAttribute('href');
  const textcontent = link.textContent;
  return textcontent.includes(href);
}

/**
 * Builds video blocks when encounter video links.
 * @param {Element} main The container element
 */
export function buildEmbedBlocks(main) {
  main.querySelectorAll('a[href]').forEach((a) => {
    if ((a.href.includes('youtu') || a.href.includes('vimeo') || a.href.includes('www.google.com/maps/embed')) && linkTextIncludesHref(a) && !a.closest('.block.embed')) {
      const embedBlock = buildBlock('embed', a.cloneNode(true));
      a.replaceWith(embedBlock);
      decorateBlock(embedBlock);
    }
  });
}

const domainCheckCache = {};

/**
 * Checks a url to determine if it is a known domain.
 * @param {string | URL} url the url to check
 * @returns {Object} an object with properties indicating the urls domain types.
 */
export function checkDomain(url) {
  const urlToCheck = typeof url === 'string' ? new URL(url) : url;

  let result = domainCheckCache[urlToCheck.hostname];
  if (!result) {
    const isProd = PRODUCTION_DOMAINS.some((host) => urlToCheck.hostname.includes(host));
    const isHlx = ['hlx.page', 'hlx.live', 'aem.page', 'aem.live'].some((host) => urlToCheck.hostname.includes(host));
    const isLocal = urlToCheck.hostname.includes('localhost');
    const isPreview = isLocal || urlToCheck.hostname.includes('hlx.page') || urlToCheck.hostname.includes('aem.page');
    const isKnown = isProd || isHlx || isLocal;
    const isExternal = !isKnown;
    result = {
      isProd,
      isHlx,
      isLocal,
      isKnown,
      isExternal,
      isPreview,
    };

    domainCheckCache[urlToCheck.hostname] = result;
  }

  return result;
}

/**
 * When there are multiple buttons in a row, display them next to each other.
 */
export function groupMultipleButtons(main) {
  const buttons = main.querySelectorAll('p.button-container');
  buttons.forEach((button) => {
    if (button.nextElementSibling && button.nextElementSibling.classList.contains('button-container')) {
      const siblingButton = button.nextElementSibling;
      if (siblingButton && !button.parentElement.classList.contains('buttons-container')) {
        const buttonContainer = createTag('div', { class: 'buttons-container' });
        button.parentElement.insertBefore(buttonContainer, button);
        buttonContainer.append(button, siblingButton);
      }
    }
  });
}

/**
 * Processes all <code> elements within the given main element, and if their text content
 * starts with 'divider' and either equals 'divider' or includes 'element', it clears their
 * text content and adds the 'divider' class to them.
 *
 * @param {HTMLElement} main - The main element containing the <code> elements to process.
 */
function buildPageDivider(main) {
  const allPageDivider = main.querySelectorAll('code');
  allPageDivider.forEach((el) => {
    const parent = el.parentElement;
    if (parent.parentElement.classList.contains('default-content-wrapper') && parent.parentElement.childElementCount === 1) {
      parent.parentElement.replaceWith(el);
    } else if (parent.tagName === 'P') {
      parent.replaceWith(el);
    }
    const alt = el.innerText.trim();
    const lower = alt.toLowerCase();
    if (lower.startsWith('divider')) {
      if (lower === 'divider' || lower.includes('element')) {
        el.innerText = '';
        el.classList.add('divider');
      }
      if (lower === 'divider-thin-dark') {
        el.innerText = '';
        el.classList.add('divider-thin-dark');
      }
      if (lower === 'divider-thin-blue-dot') {
        el.innerText = '';
        el.classList.add('divider-thin-blue-dot');
      }
    } else {
      el.classList.add('disclaimer');
    }
  });
}

/**
   * Builds fragment blocks from links to fragments
   * @param {Element} main The container element
   */
export function buildFragmentBlocks(main) {
  main.querySelectorAll('a[href]').forEach((a) => {
    const url = new URL(a.href);
    const domainCheck = checkDomain(url);
    // don't autoblock the header navigation currently in fragments
    if (domainCheck.isKnown && linkTextIncludesHref(a) && (url.pathname.includes('/fragments/') && !url.pathname.includes('header/'))) {
      if (a.closest('.accordion.faqs')) return;
      const block = buildBlock('fragment', url.pathname);
      a.replaceWith(block);
      decorateBlock(block);
    }
  });
}

/**
 * Sets the configuration for links that have config in their text coming from env-configs.json.
 * The configuration values are expected to be in the format `#_config:<type>`.
 * @param {HTMLElement} el - The element containing the links to be configured.
 */
export function setLinksConfig(el) {
  const anchors = el.querySelectorAll('a');
  if (anchors.length === 0) return;
  anchors.forEach((anchor) => {
    const envConfigs = anchor.textContent && [...anchor.textContent.matchAll(/#_config:([a-zA-Z-]+)/g)];
    if (envConfigs) {
      envConfigs.forEach((match) => {
        anchor.textContent = anchor.textContent.replace(match[0], '');
        (async function setEnvConfigUrl() {
          const url = await getEnvConfig(match[1]);
          if (!url) return;
          anchor.href = url;
        }());
      });
    }
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  setLinksConfig(main);
  decorateButtons(main);
  decorateIcons(main);
  decorateSections(main);
  decorateBlocks(main);
  buildEmbedBlocks(main);
  groupMultipleButtons(main);
  buildPageDivider(main);
  decorateExternalLinks(main);
  buildFragmentBlocks(main);
}

/**
 * Sanitizes a string for use as class name.
 * @param {string} name The unsanitized string
 * @returns {string} The class name
 */
function toClassName(name) {
  return typeof name === 'string'
    ? name
      .toLowerCase()
      .replace(/[^0-9a-z]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    : '';
}

/**
 * Loads the template module.
 * @param {string} templateName The template name
 * Need to add the template name to the validTemplates array.
 */
const validTemplates = [
  'home-page',
  'blog-page',
];
async function loadTemplate() {
  const templateName = toClassName(getMetadata('template'));
  if (templateName && validTemplates.includes(templateName)) {
    try {
      const cssLoaded = loadCSS(`${window.hlx.codeBasePath}/templates/${templateName}/${templateName}.css`);
      const mod = await import(
        `${window.hlx.codeBasePath}/templates/${templateName}/${templateName}.js`
      );
      await cssLoaded;
      return mod;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(`failed to load template ${templateName}`, error);
    }
  }
  return undefined;
}

function loadDataLayer() {
  const scriptBlock = document.createElement('script');
  scriptBlock.innerHTML = `
    // implmentation of adobe analytics
    window.cacAnalytics = window.cacAnalytics || {};

    var hostLocation = window.location.host;
    window.dataLayer = window.dataLayer || [];
    var gtm = false;
    var googleTagManagerId = '';
    var googleAnalyticsId = '';
    var noScriptTag = '';
    var fullStoryId = '';

    if (hostLocation && hostLocation.indexOf('wwwtest') != -1) {
      gtm = true;
      googleTagManagerId = 'GTM-T3JGLB4';
      googleAnalyticsId = 'UA-120917412-2';
      //fullStoryId = 'YZ5TJ'; //We do not have ID for Test for testing use QA FullStory ID
    } else if (hostLocation && hostLocation.indexOf('wwwqa') != -1) {
      gtm = true;
      googleTagManagerId = 'GTM-53N8ZWC';
      googleAnalyticsId = 'UA-2602405-3';
      fullStoryId = 'YZ5TJ';
    } else if (hostLocation && hostLocation === 'www.creditacceptance.com') {
      gtm = true;
      googleTagManagerId = 'GTM-5ZCB74P';
      googleAnalyticsId = 'UA-2602405-4';
      fullStoryId = 'YZ5JA';
    } else {
      //Below code for testing for Local and S3 hosting
      gtm = true;
      googleTagManagerId = 'GTM-T3JGLB4';
      googleAnalyticsId = 'UA-120917412-2';
      fullStoryId = 'YZ5TJ'; //We do not have ID for Test for testing use QA FullStory ID
    }
  `;
  document.head.appendChild(scriptBlock);

  window.adobeDataLayer = window.adobeDataLayer || [];
  const subProperty = window.location.pathname.split('/')[1] || 'home';
  const subSubProperty = window.location.pathname.split('/')[2] || '';
  window.cacAnalytics = {
    property: 'www',
    sub_property: subProperty,
    sub_sub_property: subSubProperty,
    page_title: document.title.toLocaleLowerCase(),
    user_id: '',
    br_language: navigator.language,
    web_lang: document.documentElement.lang,
    campaign_id: '',
    internal_cmp_id: '',
    page_url: window.location.href,
    is_spa: 'true',
    event: 'cac-page-view',
    event_type: 'cac-page-view',
  };
  const i = window.cacAnalytics;
  window.adobeDataLayer?.push(i);
}

async function waitForSectionImages(section, multiple = false) {
  if (!section) return;
  const lcpImages = multiple ? section.querySelectorAll('img') : [section.querySelector('img')];
  await Promise.all([...lcpImages].map((img) => new Promise((resolve) => {
    if (img && !img.complete) {
      img.setAttribute('loading', 'eager');
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    } else {
      resolve();
    }
  })));
}

const DEV_LAUNCH_SCRIPT = 'https://assets.adobedtm.com/ad9123205592/67641f4a9897/launch-b238893bfd09-staging.min.js';
const PROD_LAUNCH_SCRIPT = 'https://assets.adobedtm.com/ad9123205592/67641f4a9897/launch-fc986eef9273.min.js';

function loadAdobeLaunch() {
  const tag = document.createElement('script');
  tag.type = 'text/javascript';
  tag.async = true;
  if (isProductionEnvironment()) {
    tag.src = PROD_LAUNCH_SCRIPT;
  } else {
    tag.src = DEV_LAUNCH_SCRIPT;
  }
  document.querySelector('head').append(tag);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const templateModule = await loadTemplate();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main, templateModule);
    document.body.classList.add('appear');
    if (main.querySelector('.section.marquee-container')) {
      await loadSection(main.querySelector('.section.marquee-container'), (section) => waitForSectionImages(section, true));
    } else {
      await loadSection(main.querySelector('.section'), waitForSectionImages);
    }
  }
  if (window.location.hostname !== 'localhost') {
    loadAdobeLaunch();
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  autolinkModals(doc);
  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  await loadPalette();
  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3500);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDataLayer();
  loadDelayed();
}

loadPage();
