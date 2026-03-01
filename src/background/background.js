/**
 * Manipulation Index (MX) - Background Service Worker
 * Handles extension icon clicks, provides optional manual injection,
 * and manages dynamic icon updates based on page sentiment
 */

import { getAllIconImageData } from './dynamicIcon.js';
import { devLog } from '../utils/devLog.js';

// Check if we're in production mode (set by build process)
const IS_PRODUCTION = typeof self !== 'undefined' && self.PRODUCTION;

// Cache for generated icon image data
const iconCache = new Map();
// Per-tab icon data so we can restore when switching tabs
const tabIconData = new Map();

// Show help page on first install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    devLog('info', 'Background', 'Extension installed, opening help page');
    chrome.tabs.create({ url: chrome.runtime.getURL('help/help.html') });
  }
});

/**
 * Update extension icon for a specific tab using Canvas 2D rendered ImageData.
 * Chrome MV3 service workers cannot decode SVG (createImageBitmap or data URL),
 * so we draw the gauge directly on OffscreenCanvas and use imageData.
 * @param {number} tabId - Tab ID
 * @param {Object|string} analysisOrType - Analysis data or indicator type string
 */
function updateIcon(tabId, analysisOrType) {
  try {
    // Build cache key — for analysis objects, quantize intensity to reduce cache entries
    let cacheKey;
    if (typeof analysisOrType === 'string') {
      cacheKey = analysisOrType;
    } else {
      // Quantize intensity to nearest 0.05 to allow reasonable caching
      const qi = Math.round((analysisOrType.intensity || 0) * 20) / 20;
      cacheKey = `${analysisOrType.sentiment || 'neutral'}_${qi}_${analysisOrType.isManipulative ? 'm' : ''}`;
    }

    // Get or generate icon ImageData
    let iconImageData = iconCache.get(cacheKey);
    
    if (!iconImageData) {
      iconImageData = getAllIconImageData(analysisOrType);
      iconCache.set(cacheKey, iconImageData);
    }
    
    // Set the icon for this specific tab using ImageData from Canvas 2D
    chrome.action.setIcon({
      tabId: tabId,
      imageData: iconImageData
    });
    
    // Also store the imageData for this tab so we can restore on tab switch
    tabIconData.set(tabId, iconImageData);
    
    devLog('info', 'Background', `Icon updated to ${cacheKey}`, { tabId });
  } catch (error) {
    console.error('MX icon update failed:', error.message);
  }
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'log') {
    // Only forward to console when debug logging is enabled
    if (globalThis.__MX_DEBUG_LOGS) {
      const source = message.source || 'Content';
      console.log(`[${source}]`, message.data);
    }
    return false;
  } else if (message.type === 'updateIcon' || message.action === 'updateIcon') {
    // Update the extension icon for this tab — pass analysis data for continuous needle angle
    if (sender.tab && sender.tab.id) {
      const analysisData = (message.sentiment || message.intensity !== undefined)
        ? { sentiment: message.sentiment, intensity: message.intensity, isManipulative: message.isManipulative }
        : message.indicatorType; // fallback to legacy type string
      updateIcon(sender.tab.id, analysisData);
    }
    return false;
  } else if (message.type === 'getZoom') {
    // Return the browser zoom level for this tab
    if (sender.tab && sender.tab.id) {
      chrome.tabs.getZoom(sender.tab.id).then((zoom) => {
        sendResponse({ zoom });
      }).catch(() => {
        sendResponse({ zoom: 1 });
      });
      return true; // async response
    }
    sendResponse({ zoom: 1 });
    return false;
  } else if (message.type === 'openSettings') {
    // Use the standard API — always resolves from manifest's options_ui.page
    chrome.runtime.openOptionsPage();
    return false;
  } else if (message.type === 'openHelp') {
    // Path uses 'src/' prefix in dev; build.js strips it for dist automatically
    // Use double quotes so the build regex ('src/' → '') doesn't cause a quote mismatch
    const helpPage = "src/help/help.html";
    const url = chrome.runtime.getURL(helpPage);
    chrome.tabs.create({ url }).catch(() => {});
    return false;
  } else if (message.type === 'openPage') {
    // Generic fallback for any extension page
    if (message.page) {
      const url = chrome.runtime.getURL(message.page);
      chrome.tabs.create({ url }).catch(() => {});
    }
    return false;
  }
  return false;
});

// Push zoom level changes to content scripts in real-time
chrome.tabs.onZoomChange.addListener((zoomChangeInfo) => {
  chrome.tabs.sendMessage(zoomChangeInfo.tabId, {
    type: 'zoomChanged',
    zoom: zoomChangeInfo.newZoomFactor
  }).catch(() => {
    // Tab may not have content script
  });
});

// Restore per-tab icon when switching tabs (otherwise default_icon shows)
chrome.tabs.onActivated.addListener(({ tabId }) => {
  const iconImageData = tabIconData.get(tabId);
  if (iconImageData) {
    chrome.action.setIcon({ tabId, imageData: iconImageData }).catch(() => {});
  }
});

// Clean up stored icon data when tabs close
chrome.tabs.onRemoved.addListener((tabId) => {
  tabIconData.delete(tabId);
});
// @dev-only-start
// Development mode: Auto-reload on file changes
if (!IS_PRODUCTION && globalThis.__MX_DEBUG_LOGS) {
  setInterval(async () => {
    try {
      const response = await fetch('http://localhost:9876/check');
      const data = await response.json();
      if (data.shouldReload) {
        console.log('🔄 Files changed, reloading extension...');
        chrome.runtime.reload();
      }
    } catch (e) {
      // Dev server not running, ignore
    }
  }, 1000);
}
// @dev-only-end