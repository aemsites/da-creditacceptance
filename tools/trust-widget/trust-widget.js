/* eslint-disable */
import { readBlockConfig } from '../../scripts/aem.js';

// Function to initialize Trustpilot widget after script is loaded
function initializeTrustpilotWidget(widgetContainer) {
  return new Promise((resolve, reject) => {
    const checkTrustpilotReady = setInterval(() => {
      // Check if Trustpilot is ready and has the loadFromElement to load the widget
      if (window.Trustpilot && window.Trustpilot.loadFromElement) {
        clearInterval(checkTrustpilotReady); // Stop polling
        try {
          /* eslint-disable-next-line no-undef */
          Trustpilot.loadFromElement(widgetContainer); // Initialize the widget from the element
          resolve();
        } catch (error) {
          console.error('Error loading Trustpilot widget:', error);
          reject(error);
        }
      }
    }, 100); // Check every 100ms

    // Timeout in case Trustpilot doesn't load for some reason and not run into an infinite loop
    // This is a safety measure to ensure that the script doesn't hang indefinitely
    setTimeout(() => {
      clearInterval(checkTrustpilotReady);
      console.error('Trustpilot script took too long to load. Window.Trustpilot:', !!window.Trustpilot);
      /* eslint-disable-next-line prefer-promise-reject-errors */
      reject('Trustpilot script took too long to load');
    }, 15000); // Increased timeout to 15 seconds
  });
}

async function injectTrustpilotWidget(block) {
  const widgetContainer = document.createElement('div');
  widgetContainer.classList.add('trustpilot-widget-container');
  const config = readBlockConfig(block);
  // Escape potentially unsafe characters in config.link
  function escapeHTML(str) {
    if (Array.isArray(str)) {
      return str.map(s => escapeHTML(s)).join(", ");
    }
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\//g, '&#x2F;');
  }
  const safeLink = escapeHTML(config.link);
  const blockHTML = `<div>
            <div>
              <!-- TrustBox widget - Grid -->
              <div class="trustpilot-widget" data-locale="${escapeHTML(config['data-locale'])}" data-template-id="${escapeHTML(config['data-template-id'])}" data-businessunit-id="${escapeHTML(config['data-businessunit-id'])}" data-style-height="${escapeHTML(config['data-style-height'])}" data-style-width="${escapeHTML(config['data-style-width'])}" data-stars="${escapeHTML(config['data-stars'])}" data-review-languages="${escapeHTML(config['data-review-languages'])}">
              ${safeLink}
              </div>
              <!-- End TrustBox widget -->
            </div>
          </div>`;
  widgetContainer.innerHTML = blockHTML;
  block.innerHTML = '';
  block.appendChild(widgetContainer);

  // The class name 'trustpilot-widget' is used to identify the widget container
  // Jordan Confirmed that class name that will be used in the future for all Trustpilot widgets
  const widgetElement = block.querySelector('.trustpilot-widget');

  // Ensuring Trustpilot is fully initialized before trying to load the widget
  await initializeTrustpilotWidget(widgetElement);
}

export default async function decorate(block) {
  if (!block) return Promise.resolve();
  
  try {    
    await injectTrustpilotWidget(block);
  } catch (error) {
    console.error('Failed to load Trustpilot widget:', error);
    // Optionally show a fallback message
    block.innerHTML = '<p>Unable to load reviews at this time. Please try again later.</p>';
  }
  
  return Promise.resolve();
}