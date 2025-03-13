import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import { createTag, getEnvConfig } from '../../libs/utils/utils.js';

const icons = {
  user: '/icons/user.svg',
};

// media query match that indicates mobile/tablet width
const isDesktopMQ = window.matchMedia('(min-width: 960px)');
const touchDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

function detectDeviceType() {
  const hasTouchscreen = 'maxTouchPoints' in navigator && navigator.maxTouchPoints > 0;
  const hasMouse = window.matchMedia('(pointer: fine)').matches;

  let deviceType = '';

  if (hasTouchscreen && hasMouse) {
    deviceType = 'hybrid';
  } else if (hasTouchscreen) {
    deviceType = 'touchscreen';
  } else if (hasMouse) {
    deviceType = 'mouse-based';
  } else {
    deviceType = 'unknown';
  }
  return deviceType;
}

const deviceType = detectDeviceType();

function createRipple(event) {
  const button = event.currentTarget;

  const circle = document.createElement('span');
  const buttonRect = button.getBoundingClientRect();
  const diameter = Math.max(buttonRect.width, buttonRect.height);
  const radius = diameter / 2;

  // Calculate relative coordinates within the button
  const relativeX = event.clientX - buttonRect.left;
  const relativeY = event.clientY - buttonRect.top;

  circle.style.width = `${diameter}px`;
  circle.style.height = `${diameter}px`;
  circle.style.left = `${relativeX - radius}px`;
  circle.style.top = `${relativeY - radius}px`;
  circle.classList.add('ripple');

  const ripple = button.getElementsByClassName('ripple')[0];
  if (ripple) ripple.remove();
  button.prepend(circle);
}

function decorateMainMenu(section) {
  const navHeaders = section?.querySelectorAll('h3');
  if (!navHeaders) return;
  [...navHeaders].forEach((navHeader, i) => {
    const summaryTag = createTag('summary', { class: 'nav-summary' }, navHeader.textContent);
    const details = createTag('details', { class: `nav-detail detail-${i}` }, summaryTag);
    navHeader.replaceWith(details);
    const list = details.nextElementSibling;
    if (!list) return;
    const listLinks = list.querySelectorAll('li');
    details.append(list);
    /* toggle on mouseover on mouse-based/desktop OR hybrid devices/desktop */
    if ((deviceType === 'mouse-based' && isDesktopMQ.matches)
      || (deviceType === 'hybrid' && isDesktopMQ.matches)
      || (deviceType === 'touchscreen' && !touchDevice && isDesktopMQ.matches)) {
      details.addEventListener('pointerenter', () => {
        details.setAttribute('open', '');
      });
      details.addEventListener('pointerleave', () => {
        details.removeAttribute('open');
      });
      summaryTag.addEventListener('pointerdown', createRipple);
      if (listLinks.length) {
        listLinks.forEach((l) => {
          l.addEventListener('pointerdown', createRipple);
        });
      }
    }
  });
}

function formatHeaderElements(fragments) {
  fragments.forEach(async (section, i) => {
    const innerSection = section.querySelector('.section');
    if (!innerSection) return;
    section.innerHTML = innerSection.innerHTML;
    const areas = ['brand', 'quick-links', 'main', 'tools'];
    section.classList.add(`nav-${areas[i]}`);
    section.classList.remove('section-outer');
    section.removeAttribute('data-section-status');
    section.removeAttribute('style');
    const contentWrapper = section.querySelector('.default-content-wrapper');
    if (i === 0) {
      const userIcon = createTag('img', {
        src: icons.user, alt: 'Login', width: '18px', height: '21px',
      });
      const loginUrl = await getEnvConfig('customer-portal-login') || 'https://customer.creditacceptance.com/login';
      const userBtn = createTag('a', { class: 'btn-mobile btn-user', href: loginUrl, target: '_blank' }, userIcon);
      contentWrapper.prepend(userBtn);
      const hamAttr = {
        class: 'btn-mobile btn-ham',
        'aria-label': 'Toggle Main Menu',
        'aria-controls': 'nav-main',
        'aria-expanded': 'false',
        type: 'button',
      };
      const brandLink = section.querySelector('.icon-CA_Logo');
      if (brandLink) brandLink.parentNode.classList.add('btn-brand');
      section.setAttribute('data-nav-expanded', 'false');
      const hamIcon = createTag('div', { class: 'icon-ham' }, '<span></span><span></span><span></span><span></span>');
      const hamBtn = createTag('button', hamAttr, hamIcon);
      contentWrapper.append(hamBtn);
    } else {
      section.classList.add('nav-section');
      section.setAttribute('aria-expanded', 'false');
      section.setAttribute('role', 'button');
      section.setAttribute('aria-controls', 'menu');
    }
  });
  decorateMainMenu(fragments[2]);
}

function decorateFragment(block, fragment) {
  block.textContent = '';
  const fragSections = [...fragment.children];
  formatHeaderElements(fragSections);
  const nav = createTag('nav', { id: 'nav', 'aria-label': 'main-menu' }, fragSections);
  block.append(nav);

  const hamburger = document.querySelector('.btn-ham');
  const navBrand = document.querySelector('.nav-brand');
  const navSections = document.querySelectorAll('.nav-section');
  hamburger.addEventListener('click', () => {
    const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
    navBrand.setAttribute('data-nav-expanded', !isExpanded);
    hamburger.setAttribute('aria-expanded', !isExpanded);
    navSections.forEach((s) => {
      s.setAttribute('aria-expanded', !isExpanded);
    });
  });
}

/* Handle click outside of nav on mobile and detail on desktop */
document.addEventListener('click', (event) => {
  if (!isDesktopMQ.matches) {
    const mainNav = document.querySelector('#nav');
    // toggle mobile menu if clicked outside of nav
    if (mainNav && !mainNav.contains(event.target)) {
      const hamburger = document.querySelector('.btn-ham');
      if (hamburger.getAttribute('aria-expanded') === 'true') hamburger.click();
    }
  } else {
    const details = document.querySelectorAll('#nav details');
    details.forEach((detail) => {
      // toggle main menu detail if clicked outside
      if (detail && !detail.contains(event.target)) {
        if (detail.hasAttribute('open')) detail.removeAttribute('open');
      }
    });
  }
});

function toggleView() {
  const navBrand = document.querySelector('.nav-brand');
  if (isDesktopMQ.matches) {
    navBrand.setAttribute('data-nav-expanded', 'false');
  } else {
    const hamburger = document.querySelector('.btn-ham');
    const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
    navBrand.setAttribute('data-nav-expanded', isExpanded);
  }
}

// Call toggleView on resize
window.addEventListener('resize', () => {
  toggleView();
});

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);
  decorateFragment(block, fragment);
  if (!block.querySelector('.nav-quick-links.nav-section')) {
    block.classList.add('logo-only');
  }
}
