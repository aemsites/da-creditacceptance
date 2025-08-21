// Common Utils

import ffetch from '../../scripts/ffetch.js';

let palettePromise;
function fetchPalette() {
  if (!palettePromise) {
    palettePromise = new Promise((resolve, reject) => {
      (async () => {
        try {
          const paletteJson = await ffetch('/tools/taxonomy.json').sheet('palette').all();
          resolve(paletteJson);
        } catch (e) {
          reject(e);
        }
      })();
    });
  }
  return palettePromise;
}

export async function getPalette() {
  return fetchPalette();
}

export async function loadPalette() {
  const palette = await getPalette();
  if (!palette) return;
  palette.forEach((color) => {
    const propertyName = `--${color['brand-name']}`;
    try {
      window.CSS.registerProperty({
        name: propertyName,
        syntax: '<color> | <image>', // Any valid color or image(URL or a color gradient) value.
        inherits: true,
        initialValue: `${color['color-value']}`,
      });
    } catch (error) {
      // Property already registered, skip silently
      if (error.name !== 'InvalidModificationError') {
        console.warn(`Failed to register CSS property ${propertyName}:`, error);
      }
    }
  });
  document.dispatchEvent(new CustomEvent('paletteLoaded', { detail: { palette } }));
}

export function isInTextNode(node) {
  return node.parentElement.firstChild.nodeType === Node.TEXT_NODE;
}

export function createTag(tag, attributes, html, options = {}) {
  const el = document.createElement(tag);
  if (html) {
    if (html instanceof HTMLElement
      || html instanceof SVGElement
      || html instanceof DocumentFragment) {
      el.append(html);
    } else if (Array.isArray(html)) {
      el.append(...html);
    } else {
      el.insertAdjacentHTML('beforeend', html);
    }
  }
  if (attributes) {
    Object.entries(attributes).forEach(([key, val]) => {
      el.setAttribute(key, val);
    });
  }
  options.parent?.append(el);
  return el;
}

export function addStyles(path) {
  const link = document.createElement('link');
  link.setAttribute('rel', 'stylesheet');
  link.href = path;
  return link;
}

const envMapRegex = {
  test: [/^testeds(?:\..*)?\.creditacceptance\.com$/, /^test--.*.aem.(live|page)$/],
  qa: [/^qaeds(?:\..+)?\.creditacceptance\.com$/, /^qa--.*.aem.(live|page)$/],
  prod: [/^www(?:\..*)?\.creditacceptance\.com$/, /^main--.*.aem.(live|page)$/],
};

export function getEnv(_host) {
  const host = _host || window.location.host;
  const foundEnv = Object.entries(envMapRegex)
    // eslint-disable-next-line no-unused-vars
    .find(([_, regexes]) => regexes.some((regex) => new RegExp(regex, 'g').test(host)));
  if (foundEnv) {
    const [env] = foundEnv;
    return env;
  }
  return 'test';
}

export function isProductionEnvironment() {
  return getEnv() === 'prod';
}

let envConfigsPromise;
function fetchEnvConfigs() {
  if (!envConfigsPromise) {
    envConfigsPromise = new Promise((resolve, reject) => {
      (async () => {
        try {
          const envConfigs = await ffetch('/env-configs.json').all();
          resolve(envConfigs);
        } catch (e) {
          reject(e);
        }
      })();
    });
  }
  return envConfigsPromise;
}

export async function getEnvConfig(configType, { env } = { env: getEnv() }) {
  const envConfigs = await fetchEnvConfigs();
  if (!envConfigs || envConfigs.length === 0) return undefined;

  const item = envConfigs.find((config) => config.type === configType);
  return item?.[env];
}

/**
 * Returns the relative path from a given path.
 * If the path is a URL, it extracts the pathname.
 * @param {string} path - The path to get the relative path from.
 * @returns {string} - The relative path.
 */
export function getRelativePath(path) {
  let relPath = path;
  try {
    const url = new URL(path);
    relPath = url.pathname + url.search;
  } catch (error) {
    // do nothing
  }
  return relPath;
}
