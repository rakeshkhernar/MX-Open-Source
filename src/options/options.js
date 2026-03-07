/**
 * MX Options Page Script
 * Handles settings persistence using browser storage API
 * Depends on shared.js being loaded first (DEFAULT_SETTINGS).
 */

/**
 * Get the storage API (works in both Chrome and Firefox)
 */
function getStorage() {
  if (typeof browser !== 'undefined' && browser.storage) {
    return browser.storage.sync;
  }
  if (typeof chrome !== 'undefined' && chrome.storage) {
    return chrome.storage.sync;
  }
  // Fallback to localStorage for development
  return {
    get: (keys) => Promise.resolve(
      Object.fromEntries(
        Object.entries(keys).map(([k, v]) => [k, JSON.parse(localStorage.getItem(`mx_${k}`) || JSON.stringify(v))])
      )
    ),
    set: (items) => {
      Object.entries(items).forEach(([k, v]) => localStorage.setItem(`mx_${k}`, JSON.stringify(v)));
      return Promise.resolve();
    }
  };
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    const storage = getStorage();
    const settings = await storage.get(DEFAULT_SETTINGS);
    
    // Apply to UI
    elements.showIndicator.checked = settings.showIndicator;
    elements.showOnPageIndicator.checked = settings.showOnPageIndicator;
    elements.indicatorPosition.value = settings.indicatorPosition;
    elements.indicatorSize.value = settings.indicatorSize;
    elements.indicatorSizeValue.textContent = `${settings.indicatorSize}px`;
    elements.indicatorOpacity.value = settings.indicatorOpacity;
    elements.indicatorOpacityValue.textContent = `${settings.indicatorOpacity}%`;
    elements.manipulationAlerts.checked = settings.manipulationAlerts;
    elements.sensitivity.value = settings.sensitivity;
    elements.disabledSites.value = settings.disabledSites;
    
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

/**
 * Save settings to storage
 */
async function saveSettings() {
  try {
    const settings = {
      showIndicator: elements.showIndicator.checked,
      showOnPageIndicator: elements.showOnPageIndicator.checked,
      indicatorPosition: elements.indicatorPosition.value,
      indicatorSize: Math.min(256, Math.max(32, parseInt(elements.indicatorSize.value) || 48)),
      indicatorOpacity: Math.min(100, Math.max(5, parseInt(elements.indicatorOpacity.value) || 80)),
      manipulationAlerts: elements.manipulationAlerts.checked,
      sensitivity: ['low', 'medium', 'high'].includes(elements.sensitivity.value) ? elements.sensitivity.value : 'medium',
      disabledSites: elements.disabledSites.value
    };
    
    const storage = getStorage();
    await storage.set(settings);
    
    showStatus('Settings saved!');
    // Content scripts pick up changes automatically via chrome.storage.onChanged
    
  } catch (error) {
    console.error('Failed to save settings:', error);
    showStatus('Failed to save!', true);
  }
}

/**
 * Schedule auto-save (debounced)
 */
let saveTimeout = null;
function scheduleSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    saveSettings();
  }, 300);
}

/**
 * Reset settings to defaults
 */
async function resetSettings() {
  if (!confirm('Reset all settings to their default values?')) return;
  
  try {
    const storage = getStorage();
    await storage.set(DEFAULT_SETTINGS);
    await loadSettings();
    showStatus('Settings reset!');
  } catch (error) {
    console.error('Failed to reset settings:', error);
    showStatus('Failed to reset!', true);
  }
}

/**
 * Show status message
 */
function showStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.style.background = isError ? '#ef4444' : '#22c55e';
  elements.status.classList.add('show');
  
  setTimeout(() => {
    elements.status.classList.remove('show');
  }, 2000);
}

/**
 * Update range value displays
 */
function updateRangeDisplays() {
  elements.indicatorSizeValue.textContent = `${elements.indicatorSize.value}px`;
  elements.indicatorOpacityValue.textContent = `${elements.indicatorOpacity.value}%`;
}

// DOM elements (initialized after DOM is ready)
let elements;

function init() {
  elements = {
    showIndicator: document.getElementById('showIndicator'),
    showOnPageIndicator: document.getElementById('showOnPageIndicator'),
    indicatorPosition: document.getElementById('indicatorPosition'),
    indicatorSize: document.getElementById('indicatorSize'),
    indicatorSizeValue: document.getElementById('indicatorSizeValue'),
    indicatorOpacity: document.getElementById('indicatorOpacity'),
    indicatorOpacityValue: document.getElementById('indicatorOpacityValue'),
    manipulationAlerts: document.getElementById('manipulationAlerts'),
    sensitivity: document.getElementById('sensitivity'),
    disabledSites: document.getElementById('disabledSites'),
    resetBtn: document.getElementById('resetBtn'),
    status: document.getElementById('status')
  };

  // Event listeners
  elements.resetBtn.addEventListener('click', resetSettings);
  elements.indicatorSize.addEventListener('input', () => {
    updateRangeDisplays();
    scheduleSave();
  });
  elements.indicatorOpacity.addEventListener('input', () => {
    updateRangeDisplays();
    scheduleSave();
  });

  [elements.showIndicator,
   elements.showOnPageIndicator,
   elements.indicatorPosition,
   elements.manipulationAlerts,
   elements.sensitivity,
   elements.disabledSites].forEach((el) => {
    if (!el) return;
    el.addEventListener('input', scheduleSave);
    el.addEventListener('change', scheduleSave);
  });

  // Help link - open in new tab with proper extension URL
  const helpLink = document.getElementById('helpLink');
  if (helpLink) {
    helpLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.tabs.create({ url: chrome.runtime.getURL('help/help.html') });
      } else {
        window.open('../help/help.html', '_blank');
      }
    });
  }

  // Keyboard shortcut: Ctrl+S to save
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveSettings();
    }
  });

  // Inject version from manifest so it stays in sync automatically
  const versionEl = document.getElementById('appVersion');
  if (versionEl && typeof chrome !== 'undefined' && chrome.runtime?.getManifest) {
    versionEl.textContent = `Manipulation Index v${chrome.runtime.getManifest().version}`;
  }

  // Load settings on page load
  loadSettings();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
