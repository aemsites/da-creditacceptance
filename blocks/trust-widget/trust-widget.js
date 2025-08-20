/* eslint-disable */
import { readBlockConfig } from '../../scripts/aem.js';
async function loadTrustpilotScript() {
  return new Promise((resolve, reject) => {
    if (window.Trustpilot) {
      resolve();
      return;
    }
    const existingScript = document.querySelector('script[src="//widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', resolve);
      existingScript.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = '//widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js';
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

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

  // Parse the widget HTML
//   const parser = new DOMParser();
//   const parsedHTMLDoc = parser.parseFromString(block.innerHTML.trim(), 'text/html');

//   const matchParsedToWidgetHTMLOutput = cleanParsedHTML(parsedHTMLDoc.body.innerHTML.trim());
//   const finalHTML = fixHTMLStructure(matchParsedToWidgetHTMLOutput);
//   widgetContainer.innerHTML = finalHTML;

    const config = readBlockConfig(block);

  const blockHTML = `<div>
            <div>
              <!-- TrustBox widget - Grid -->
              <div class="trustpilot-widget" data-locale="${config['data-locale']}" data-template-id="${config['data-template-id']}" data-businessunit-id="${config['data-businessunit-id']}" data-style-height="${config['data-style-height']}" data-style-width="${config['data-style-width']}" data-stars="${config['data-stars']}" data-review-languages="${config['data-review-languages']}">
              ${config.link}
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
    // Load Trustpilot script first
    await loadTrustpilotScript();
    
    // Then inject the widget
    await injectTrustpilotWidget(block);
  } catch (error) {
    console.error('Failed to load Trustpilot widget:', error);
    // Optionally show a fallback message
    block.innerHTML = '<p>Unable to load reviews at this time. Please try again later.</p>';
  }
  
  return Promise.resolve();
}