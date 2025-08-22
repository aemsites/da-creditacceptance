/* eslint-disable */
import { readBlockConfig } from '../../scripts/aem.js';

// eslint-disable-next-line no-unused-vars, import/prefer-default-export
export function useTrustpilotWidget(block, callback) {
  // Function to initialize the external resources
  function initialize() {
    // Add external JavaScript
    const script = document.createElement('script');
    script.src = '//widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js';
    script.async = true;
    document.head.appendChild(script);
    const scriptLoaded = new Promise((resolve) => {
      script.onload = () => resolve();
    });

    // Callback function to execute after the script is loaded
    scriptLoaded.then(() => {
      if (callback && typeof callback === 'function') {
        callback();
      }
    });

    // Cleanup function to remove the script when needed
    return () => {
      document.head.removeChild(script);
    };
  }
  initialize();
}

// Function to initialize Trustpilot widget after script is loaded
function initializeTrustpilotWidget(widgetContainer) {
  try {
    /* eslint-disable-next-line no-undef */
    Trustpilot.loadFromElement(widgetContainer); // Initialize the widget from the element
  } catch (error) {
    console.error('Error loading Trustpilot widget:', error);
    throw error;
  }
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
  initializeTrustpilotWidget(widgetElement);
}

export default async function decorate(block) {
  if (!block) return Promise.resolve();
  
  // Use the Trustpilot widget loader with callback
  useTrustpilotWidget(block, async () => {
    try {
      await injectTrustpilotWidget(block);
    } catch (error) {
      console.error('Failed to load Trustpilot widget:', error);
      // Optionally show a fallback message
      block.innerHTML = '<p>Unable to load reviews at this time. Please try again later.</p>';
    }
  });
  
  return Promise.resolve();
}