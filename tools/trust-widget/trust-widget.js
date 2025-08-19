/**
 * Trust Widget Plugin for AEM Sidekick
 *
 * Allows users to inject Trust Pilot widgets (https://www.trustpilot.com)
 * originating as HTML code into documents
 */

/* eslint-disable */
import DA_SDK from 'https://da.live/nx/utils/sdk.js';
// import { DA_ORIGIN } from 'https://da.live/nx/public/utils/constants.js';
// import { createElement } from '/scripts/utils.js';

const TP_SCRIPT_SRC = 'https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js';
/**
 * Constants for Trust Pilot widget plugin
 */
// const CONSTANTS = {
//   TRUSTPILOT: {
//     HOST: 's3.tradingview.com',
//     BASE_URL: 'https://s3.tradingview.com/external-embedding/',
//     WIDGET_TYPE_PREFIX: 'embed-widget-',
//     DEFAULT_CONFIG: {  // Default config
//       "chartOnly": true,
//       "width": "100%"
//     },
//     DEFAULT_HEIGHT: '500px'
//   }
// };

/**
 * Initializes the trust pilot plugin interface and sets up event handlers
 */
(async function init() {
  try {
    // Import DA SDK components
    const { context, token, actions } = await DA_SDK;
    const { daFetch } = actions;

    // Set current document/page path
    const pageInput = document.getElementById('current-path');
    pageInput.textContent = context.path;

    // Get UI elements
    const elements = {
      container: document.querySelector('.trust-widget-container'),
      applyBtn: document.getElementById('apply-button'),
      pathDisplay: document.getElementById('current-path')
    };

    // Set up event listeners
    setupEventListeners(elements, actions);

  } catch (error) {
    handleError(error.message);
  }
}());

/**
 * Sets up all event listeners
 * @param {Object} elements - UI elements
 * @param {Object} actions - SDK actions
 */
function setupEventListeners(elements, actions) {
  const { applyBtn } = elements;

  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      insertBlock(actions);
    });
  }
}

/**
 * Generates Trust Pilot widget block markup to be injected into document
 * @param {string} scriptSrc - The widget script source
 * @param {Object} config - The widget configuration
 * @returns {string} HTML table string
 */
function generateConfigTable(scriptSrc, config) {
  return `
    <table style="min-width: 221px;">
      <colgroup><col style="width: 196px;"><col></colgroup>
      <tbody>
        <tr><td colspan="2" data-colwidth="196,0"><p>Trust Widget</p></td></tr>
        <tr><td data-colwidth="196"><p>script</p></td><td><p>${scriptSrc}</p></td></tr>
        ${ Object.entries(config).map(([key, value]) => `
          <tr><td data-colwidth="196"><p>${key}</p></td><td><p>${value}</p></td></tr>
        `).join('')}
      </tbody>
    </table>`;
}

/**
 * Parses Trust Pilot widget HTML code from textarea
 * @returns {Object} Object containing script source and config
 */
function parseUserProvidedWidgetHTML() {
  // Parse the user provided widget HTML code into a DOM object
  const textarea = document.getElementById('widgetHTMLCode');
  const widgetHTMLCode = textarea.value;
  const parser = new DOMParser();
  const doc = parser.parseFromString(widgetHTMLCode, 'text/html');

  // Extract and parse the HTML and create a config object
  /**
   * <!-- TrustBox widget - Grid -->
   * <div class="trustpilot-widget" data-locale="en-US" data-template-id="539adbd6dec7e10e686debee" data-businessunit-id="57e022220000ff000594ea87" data-style-height="500px" data-style-width="100%" data-stars="4,5" data-review-languages="en">
   * <a href="https://www.trustpilot.com/review/creditacceptance.com" target="_blank" rel="noopener">Trustpilot</a>
   * </div>
   * <!-- End TrustBox widget -->
   */
  const trustpilotWidget = doc.querySelector('.trustpilot-widget');
  const trustpilotLink = doc.querySelector('.trustpilot-widget a');
  console.log('trustpilotLink:', trustpilotLink);
  if (trustpilotWidget && trustpilotLink) {
    // Extract all data attributes from the widget div
    const dataAttributes = {};
    const attributes = trustpilotWidget.attributes;
    
    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes[i];
      if (attr.name.startsWith('data-')) {
        dataAttributes[attr.name] = attr.value;
      }
    }
    
    const config = {
      "scriptSrc": TP_SCRIPT_SRC,
      "config": {
        ...dataAttributes,
        "link": trustpilotLink.outerHTML,
      }
    };
    
    return config;
  } else {
    handleError('No Trust Pilot widget found in the HTML code.');
    return null;
  }
}

function insertBlock(actions) {
  console.log('insertBlock');
  // Parse the widget HTML and extract configuration
  const widgetConfig = parseUserProvidedWidgetHTML();
  if (!widgetConfig) { // If no widget config is found, return
    console.log('No widget config found');
    return;
  }

  // Inject the Trust Pilot widget into the document
  try {
    if (actions && actions.sendHTML) {
      const { scriptSrc: injectedBlockScriptSrc, config: injectedBlockConfig } = widgetConfig;
      const configHTML = generateConfigTable(injectedBlockScriptSrc, injectedBlockConfig);
      console.log('configHTML:', configHTML);
      actions.sendHTML(configHTML);
      actions.closeLibrary();
    } else {
      handleError('Cannot inject Trust Widget : Document editor actions not available');
    }
  } catch (err) {
    handleError('Failed to inject Trust Widget into document: ' + err.message);
  }
}

/**
 * Handles initialization error
 * @param {Error} error - Error object
 */
function handleError(error) {
  console.error('Error:', error);
  const container = document.getElementById('trust-widget-msg');
  if (container) {
    container.innerHTML = `
      <div class="trust-widget-error">
        <p>${error}</p>
      </div>
    `;
  }
}