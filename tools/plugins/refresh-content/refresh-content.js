/**
 * DA Plugin: Refresh Content from Source
 * Re-scrapes and updates document content from original source URL
 */

import DA_SDK from 'https://da.live/nx/utils/sdk.js';

// Configuration - Update this if you deploy a CORS proxy
const CORS_PROXY = ''; // e.g., 'https://your-proxy.com/api/fetch?url='

let context;
let actions;

/**
 * Initialize the plugin
 */
async function init() {
  try {
    // Wait for DA SDK to be ready
    const sdk = await DA_SDK;
    context = sdk.context;
    actions = sdk.actions;

    console.log('DA Plugin initialized', { context });

    // Render the UI
    renderUI();

  } catch (error) {
    console.error('Failed to initialize plugin:', error);
    showError('Failed to initialize plugin');
  }
}

/**
 * Render the plugin UI
 */
function renderUI() {
  const container = document.getElementById('content');

  container.innerHTML = `
    <h2>Refresh Content from Source</h2>
    <p class="description">
      Re-scrape and update this document from its original source URL.
      This will replace the current content with the latest version from the source.
    </p>

    <div class="form-group">
      <label for="source-url">Source URL</label>
      <input
        type="url"
        id="source-url"
        placeholder="https://example.com/page-to-scrape"
        required
      />
      <div class="help-text">
        Enter the URL of the page you want to scrape and convert to DA format
      </div>
    </div>

    <div class="button-group">
      <button id="refresh-btn" class="primary" disabled>
        Refresh Content
      </button>
      <button id="cancel-btn" class="secondary">
        Cancel
      </button>
    </div>

    <div id="status" class="status"></div>
  `;

  // Set up event listeners
  setupEventListeners();

  // Try to pre-fill source URL if available
  prefillSourceUrl();
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  const refreshBtn = document.getElementById('refresh-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const sourceUrlInput = document.getElementById('source-url');

  refreshBtn.addEventListener('click', handleRefresh);
  cancelBtn.addEventListener('click', handleCancel);

  // Enable/disable refresh button based on URL input
  sourceUrlInput.addEventListener('input', (e) => {
    refreshBtn.disabled = !e.target.value.trim();
  });

  // Allow Enter key to trigger refresh
  sourceUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && sourceUrlInput.value.trim()) {
      handleRefresh();
    }
  });
}

/**
 * Try to pre-fill source URL from context or URL parameters
 */
function prefillSourceUrl() {
  const sourceUrlInput = document.getElementById('source-url');

  // Check URL parameters first
  const params = new URLSearchParams(window.location.search);
  const urlParam = params.get('url');

  if (urlParam) {
    sourceUrlInput.value = urlParam;
    document.getElementById('refresh-btn').disabled = false;
    return;
  }

  // Check context for source URL
  // Note: This may not be available in all cases
  if (context?.metadata?.sourceUrl) {
    sourceUrlInput.value = context.metadata.sourceUrl;
    document.getElementById('refresh-btn').disabled = false;
  }
}

/**
 * Handle refresh button click
 */
async function handleRefresh() {
  const sourceUrlInput = document.getElementById('source-url');
  const sourceUrl = sourceUrlInput.value.trim();

  if (!sourceUrl) {
    showStatus('Please enter a valid source URL', 'error');
    return;
  }

  // Validate URL format
  try {
    new URL(sourceUrl);
  } catch (error) {
    showStatus('Please enter a valid URL', 'error');
    return;
  }

  // Disable UI during refresh
  setLoading(true);
  showStatus('Fetching content from source...', 'info');

  try {
    // Fetch and convert content
    const html = await scrapeAndConvert(sourceUrl);

    if (html) {
      showStatus('Sending updated content to document...', 'info');

      // Send the new HTML to the document
      await actions.sendHTML(html);

      showStatus('Content refreshed successfully!', 'success');

      // Close the library after a brief delay
      setTimeout(() => {
        actions.closeLibrary();
      }, 1500);
    } else {
      throw new Error('No content received from source');
    }
  } catch (error) {
    console.error('Refresh error:', error);
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    setLoading(false);
  }
}

/**
 * Scrape and convert content from source URL
 * @param {string} sourceUrl - URL to scrape
 * @returns {Promise<string>} DA-compliant HTML
 */
async function scrapeAndConvert(sourceUrl) {
  try {
    let html;
    let fetchUrl = sourceUrl;

    // If CORS proxy is configured, use it
    if (CORS_PROXY) {
      fetchUrl = `${CORS_PROXY}${encodeURIComponent(sourceUrl)}`;
    }

    showStatus('Fetching page content...', 'info');

    // Fetch the source page
    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DA-Plugin/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    html = await response.text();

    showStatus('Parsing and cleaning content...', 'info');

    // Parse and clean the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract metadata
    const metadata = extractMetadata(doc);

    // Extract main content
    const mainContent = extractMainContent(doc);

    // Convert to DA-compliant HTML
    const daHTML = convertToDAHTML(mainContent, metadata, sourceUrl);

    return daHTML;

  } catch (error) {
    if (error.message.includes('Failed to fetch')) {
      throw new Error(
        'Failed to fetch content. The source may not allow cross-origin requests. ' +
        'Please configure a CORS proxy or use a different source.'
      );
    }
    throw error;
  }
}

/**
 * Extract metadata from document
 * @param {Document} doc - Parsed document
 * @returns {Object} Metadata object
 */
function extractMetadata(doc) {
  const metadata = {
    title: '',
    description: '',
    image: '',
  };

  // Title
  const ogTitle = doc.querySelector('meta[property="og:title"]');
  const titleTag = doc.querySelector('title');
  metadata.title = ogTitle?.content || titleTag?.textContent || '';

  // Description
  const ogDescription = doc.querySelector('meta[property="og:description"]');
  const metaDescription = doc.querySelector('meta[name="description"]');
  metadata.description = ogDescription?.content || metaDescription?.content || '';

  // Image
  const ogImage = doc.querySelector('meta[property="og:image"]');
  metadata.image = ogImage?.content || '';

  return metadata;
}

/**
 * Extract main content from document
 * @param {Document} doc - Parsed document
 * @returns {Element} Main content element
 */
function extractMainContent(doc) {
  // Try common content selectors
  const selectors = [
    'main',
    '[role="main"]',
    'article',
    '.content',
    '.main-content',
    '#content',
    '#main',
    'body',
  ];

  for (const selector of selectors) {
    const element = doc.querySelector(selector);
    if (element) {
      // Clone the element
      const content = element.cloneNode(true);

      // Remove unwanted elements
      cleanContent(content);

      return content;
    }
  }

  return doc.body;
}

/**
 * Clean unwanted elements from content
 * @param {Element} element - Content element
 */
function cleanContent(element) {
  const unwantedSelectors = [
    'script',
    'style',
    'iframe',
    'nav',
    'header:not(main header)',
    'footer:not(main footer)',
    '.nav',
    '.navigation',
    '.menu',
    '.sidebar',
    '.ads',
    '.advertisement',
    '[role="navigation"]',
    '[role="complementary"]',
    '[role="banner"]',
  ];

  unwantedSelectors.forEach((selector) => {
    element.querySelectorAll(selector).forEach((el) => el.remove());
  });
}

/**
 * Convert content to DA-compliant HTML
 * @param {Element} content - Main content element
 * @param {Object} metadata - Page metadata
 * @param {string} sourceUrl - Original source URL
 * @returns {string} DA-compliant HTML
 */
function convertToDAHTML(content, metadata, sourceUrl) {
  // Basic conversion - wrap content in proper structure
  const html = `
<html>
  <head>
    <title>${escapeHtml(metadata.title)}</title>
    <meta name="description" content="${escapeHtml(metadata.description)}">
    <meta name="sourceUrl" content="${escapeHtml(sourceUrl)}">
  </head>
  <body>
    <header></header>
    <main>
      ${content.innerHTML}
    </main>
    <footer></footer>
  </body>
</html>
`.trim();

  return html;
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Handle cancel button click
 */
function handleCancel() {
  actions.closeLibrary();
}

/**
 * Show status message
 * @param {string} message - Message to display
 * @param {string} type - Message type: 'info', 'success', or 'error'
 */
function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.style.display = 'block';
}

/**
 * Set loading state
 * @param {boolean} loading - Whether loading is active
 */
function setLoading(loading) {
  const refreshBtn = document.getElementById('refresh-btn');
  const sourceUrlInput = document.getElementById('source-url');

  if (loading) {
    refreshBtn.disabled = true;
    sourceUrlInput.disabled = true;
    refreshBtn.innerHTML = '<span class="loading-spinner"></span>Refreshing...';
  } else {
    refreshBtn.disabled = !sourceUrlInput.value.trim();
    sourceUrlInput.disabled = false;
    refreshBtn.textContent = 'Refresh Content';
  }
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
  const container = document.getElementById('content');
  container.innerHTML = `
    <div class="status error" style="display: block;">
      <strong>Error:</strong> ${escapeHtml(message)}
    </div>
  `;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
