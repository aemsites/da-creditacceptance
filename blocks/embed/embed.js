/*
 * Embed Block
 * Show videos and social posts directly on your page
 * https://www.hlx.live/developer/block-collection/embed
 */

import { loadScript, readBlockConfig } from '../../scripts/aem.js';
import { getEnv } from '../../libs/utils/utils.js';

const getDefaultEmbed = (url, height) => {
  const divHeight = height ? `${height}px` : '100%';
  const iframeHeight = height ? `${height}px` : '100%';

  return `<div style="width: 100%; height: ${divHeight}; position: relative; padding-bottom: 56.25%;">
      <iframe src="${url.href}" style="border: 0; top: 0; left: 0; width: 100%; height: ${iframeHeight}; position: absolute;" allowfullscreen=""
        scrolling="yes" allow="encrypted-media" title="Content from ${url.hostname}" loading="lazy">
      </iframe>
    </div>`;
};

// Function to extract videoId from YouTube and Vimeo URLs
const getVideoId = (url) => {
  if (url.origin.includes('youtu.be')) {
    return url.pathname.substring(1);
  }
  if (url.hostname.includes('youtube.com')) {
    return new URLSearchParams(url.search).get('v') || url.pathname.split('/').pop();
  }
  if (url.hostname.includes('vimeo.com')) {
    // lite-vimeo script expects a player.vimeo.com/video URL, so if we have a short URL
    // we need to extract the video ID separately here
    const videoId = url.pathname.split('/').pop();
    const hParam = url.searchParams.get('h');
    return hParam ? `${videoId}?h=${hParam}` : videoId;
  }
  return null;
};

// YouTube embed with lite-youtube
const embedYoutube = async (url) => {
  await loadScript('/blocks/embed/lite-yt-embed/lite-yt-embed.js');
  const videoId = getVideoId(url);
  const wrapper = document.createElement('div');
  wrapper.setAttribute('itemscope', '');
  wrapper.setAttribute('itemtype', 'https://schema.org/VideoObject');

  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${videoId}`);
    const json = await response.json();
    wrapper.innerHTML = `
      <meta itemprop="name" content="${json.title}"/>
      <link itemprop="embedUrl" href="https://www.youtube.com/embed/${videoId}"/>
      <link itemprop="thumbnailUrl" href="${json.thumbnail_url}"/>
      ${wrapper.innerHTML}
    `;
  } catch (err) {
    // Nothing to do, metadata just won't be added to the video
  }
  const litePlayer = document.createElement('lite-youtube');
  litePlayer.setAttribute('videoid', videoId);
  litePlayer.setAttribute(
    'style',
    'background-image: url(./media_1ded06180650a1d8084f19126fcb1b7eaf33ae28c.png?width=500&format=pjpg&optimize=medium)',
  );
  wrapper.append(litePlayer);
  return wrapper.outerHTML;
};

// Vimeo embed with lite-vimeo-embed
export const embedVimeo = async (url, imageUrl) => {
  await loadScript('/blocks/embed/lite-vimeo-embed/lite-vimeo-embed.js');
  const videoId = getVideoId(url);
  const wrapper = document.createElement('div');
  wrapper.setAttribute('itemscope', '');
  wrapper.setAttribute('itemtype', 'https://schema.org/VideoObject');

  try {
    const response = await fetch(`https://vimeo.com/api/oembed.json?url=https://player.vimeo.com/video/${videoId}`);
    const json = await response.json();
    wrapper.innerHTML = `
      <meta itemprop="name" content="${json.title}"/>
      <link itemprop="embedUrl" href="https://player.vimeo.com/video/${videoId}"/>
      <link itemprop="thumbnailUrl" href="${json.thumbnail_url}"/>
      ${wrapper.innerHTML}
    `;
  } catch (err) {
    // Nothing to do, metadata just won't be added to the video
  }
  const litePlayer = document.createElement('lite-vimeo');
  litePlayer.setAttribute('videoid', videoId);
  litePlayer.setAttribute('image-url', imageUrl);
  const playBtnEl = document.createElement('button');
  playBtnEl.setAttribute(('class', 'ltv-playbtn'), ('aria-label', 'Video play button'));
  wrapper.append(litePlayer);
  return wrapper.outerHTML;
};

// Vimeo Showcase embed with lite-vimeo-showcase
const embedShowcase = async (url, imageUrl) => {
  await loadScript('/blocks/embed/lite-vimeo-showcase/lite-vimeo-showcase.js');
  const showcaseUrl = url.href;
  const wrapper = document.createElement('div');
  wrapper.setAttribute('itemscope', '');
  wrapper.setAttribute('itemtype', 'https://schema.org/VideoObject');

  const litePlayer = document.createElement('lite-vimeo-showcase');
  litePlayer.setAttribute('showcase-url', showcaseUrl);
  litePlayer.setAttribute('image-url', imageUrl);
  const playBtnEl = document.createElement('button');
  playBtnEl.setAttribute(('class', 'ltv-playbtn'), ('aria-label', 'Video play button'));
  wrapper.append(litePlayer);
  return wrapper.outerHTML;
};

const EMBEDS_CONFIG = {
  vimeo: embedVimeo,
  youtube: embedYoutube,
  vimeoShowcase: embedShowcase,
};

function getPlatform(url) {
  const [service] = url.hostname.split('.').slice(-2, -1);
  if (service === 'youtu') {
    return 'youtube';
  }
  return service;
}

const loadEmbed = async (block, service, url, height) => {
  block.classList.toggle('skeleton', true);
  let embedService = service;
  if (service === 'vimeo' && url.pathname.includes('showcase')) {
    embedService = 'vimeoShowcase';
  }

  const embed = EMBEDS_CONFIG[embedService];
  if (!embed) {
    block.classList.toggle('generic', true);
    block.innerHTML = getDefaultEmbed(url, height);
    return;
  }

  try {
    block.classList.toggle(service, true);
    try {
      if (embedService.indexOf('vimeo') > -1) {
        const imageUrl = block.querySelector('img')?.src;
        block.innerHTML = await embed(url, imageUrl);
      } else {
        block.innerHTML = await embed(url);
      }
    } catch (err) {
      block.style.display = 'none';
    } finally {
      block.classList.toggle('skeleton', false);
    }
  } catch (err) {
    block.style.maxHeight = '0px';
  }
};

/**
 * @param {HTMLDivElement} block
 */
export default async function decorate(block) {
  const meta = readBlockConfig(block);
  let link = block.querySelector('a')?.href;
  if (meta && meta.test && meta.prod) {
    if (getEnv() === 'prod') link = meta.prod;
    else if (getEnv() === 'qa') link = meta.qa;
    else link = meta.test;
  }
  const url = new URL(link.replace(/%5C%5C_/, '_'));
  const { text } = block.querySelector('a');
  const getHeightVal = text.match(/height:\s*(\d+)px/);
  let height = (getHeightVal) ? parseInt(getHeightVal[1], 10) : null;
  if (!height) {
    const minHeightClass = [...block.classList].find((cls) => cls.startsWith('min-height-'));
    const minHeightValue = minHeightClass ? parseInt(minHeightClass.replace('min-height-', ''), 10) : null;
    height = minHeightValue;
  }

  block.querySelector('a').style.visibility = 'hidden';

  let service;
  if (block.classList.contains('showcase')) {
    service = 'vimeoShowcase';
  } else {
    service = getPlatform(url);
  }
  // Both YouTube and TikTok use an optimized lib that already leverages the intersection observer
  if (service !== 'youtube') {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) {
        return;
      }
      loadEmbed(block, service, url, height);
      observer.unobserve(block);
    });
    observer.observe(block);
    return Promise.resolve();
  }
  return loadEmbed(block, service, url);
}
