/**
 * MX Popup Script
 * Shows detailed analysis when user clicks extension icon
 * Depends on shared.js being loaded first (escapeHtml, parseDisabledSites,
 * resolveIndicatorType, getSentimentLabel, formatConfidence, SIGNAL_COLORS,
 * collectSignalGroups, buildDonutChart, buildGaugeSVG, NEUTRAL_SVG).
 */

const ICON_URL = (typeof chrome !== 'undefined' && chrome.runtime)
  ? chrome.runtime.getURL('icons/icon-48.svg')
  : 'icons/icon-48.svg';

/** Safely set element HTML content without triggering AMO linter warnings */
function safeHTML(el, html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  el.replaceChildren(...doc.body.childNodes);
}

/** True while the popup is showing the disabled-site view. Guards against
 *  stale analysisUpdated messages overwriting the disabled screen. */
let siteIsDisabled = false;

/** Briefly true during re-enable transition to suppress live analysis
 *  updates until init() fetches the definitive result. */
let _suppressLiveUpdates = false;

/**
 * Resolve the target tab for this popup.
 * When opened from the tooltip "See More" button, a tabId URL param is present.
 * Otherwise fall back to the active tab in the current window.
 */
async function getTargetTab() {
  const urlParams = new URLSearchParams(window.location.search);
  const paramId = urlParams.get('tabId');
  if (paramId) {
    const id = parseInt(paramId, 10);
    try {
      const tab = await chrome.tabs.get(id);
      return tab;
    } catch {
      // Tab may have been closed
      return null;
    }
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

function updateContentHeight() {
  const contentEl = document.getElementById('content');
  if (!contentEl) return;

  const headerEl = document.querySelector('.header');
  const actionsEl = document.querySelector('.actions');
  const headerHeight = headerEl ? headerEl.offsetHeight : 0;
  const actionsHeight = actionsEl ? actionsEl.offsetHeight : 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const contentHeight = contentEl.scrollHeight;
  const desiredHeight = headerHeight + actionsHeight + contentHeight;
  const available = Math.max(120, viewportHeight - headerHeight - actionsHeight);

  if (!viewportHeight || desiredHeight <= viewportHeight) {
    contentEl.style.height = 'auto';
    contentEl.style.maxHeight = 'none';
    document.documentElement.style.height = 'auto';
    document.body.style.height = 'auto';
  } else {
    contentEl.style.height = `${available}px`;
    contentEl.style.maxHeight = `${available}px`;
    document.documentElement.style.height = '100%';
    document.body.style.height = '100%';
  }
}

function renderAnalysis(data) {
  if (siteIsDisabled) return;  // Don't overwrite disabled view
  const contentEl = document.getElementById('content');
  const headerLogo = document.getElementById('headerLogo');
  clearRetry();
  isErrorState = false;
  lastErrorMessage = '';
  userHasScrolled = false;
  _activeChipKey = null;  // Reset drill-down state on re-render
  
  if (headerLogo) {
    safeHTML(headerLogo, buildGaugeSVG(data));
  }
  
  // Create temp element to diff content to avoid unnecessary re-renders that reset scroll
  const tempDiv = document.createElement('div');

  const indicatorType = resolveIndicatorType(data);
  
  const sentimentLabel = getSentimentLabel(data.sentiment, data.intensity, data.isManipulative);
  
  const intensityPct = `${(data.intensity * 100).toFixed(0)}% intensity`;
  const pageTitle = escapeHtml(data.pageTitle || '');
  const pageHost = escapeHtml((data.pageHost || '').replace(/^www\./, ''));
  let html = `
    <div class="status" data-sentiment="${data.sentiment}" data-manipulative="${data.isManipulative}">
      <div class="indicator">${buildGaugeSVG(data)}</div>
      <div class="sentiment-label">${sentimentLabel}</div>
      <div class="confidence">${formatConfidence(data.confidence)} \u00b7 ${intensityPct} \u00b7 ${data.wordCount} words analyzed</div>
      ${pageTitle || pageHost ? `<div class="page-info"><span class="page-title"><span class="page-title-text">${pageTitle}</span></span>${pageHost ? `<span class="page-host">${pageHost}</span>` : ''}</div>` : ''}
    </div>
  `;
  
  if (data.isManipulative) {
    html += `
      <div class="manipulation-warning">
        <div class="icon">⚠️</div>
        <div class="text">
          This content shows patterns commonly associated with manipulative media.
          Read critically and verify claims from multiple sources.
        </div>
      </div>
    `;
  } else if (data.sentiment === 'neutral') {
    html += `<div class="neutral-note">Neutral tone doesn\u2019t guarantee accuracy \u2014 MX detects writing style, not truthfulness.</div>`;
  }
  
  // Build donut chart (or no-signals fallback) via shared utilities
  const groups = collectSignalGroups(data);
  html += buildDonutChart(groups, data);
  
  safeHTML(tempDiv, html);
  
  // Check if content is actually different (ignoring whitespace)
  if (contentEl.innerHTML.replace(/\s+/g, '') === tempDiv.innerHTML.replace(/\s+/g, '')) {
     return;
  }

  // Save scroll position
  const scrollTop = contentEl.scrollTop;
  safeHTML(contentEl, html);
  // Restore scroll position
  if (scrollTop > 0) {
    contentEl.scrollTop = scrollTop;
  }

  requestAnimationFrame(updateContentHeight);
}

function showError(message) {
  const contentEl = document.getElementById('content');
  const headerLogo = document.getElementById('headerLogo');
  
  // If we are already in error state and message is the same, don't re-render
  // This prevents scroll resetting
  if (isErrorState && message === lastErrorMessage) {
    scheduleRetry();
    return;
  }
  
  lastErrorMessage = message;
  isErrorState = true;
  
  if (headerLogo) {
    safeHTML(headerLogo, `<img src="${ICON_URL}" alt="MX" width="32" height="32" />`);
  }
  
  // Provide helpful suggestions based on error type
  let suggestion = '';
  if (message.includes('connect')) {
    suggestion = 'Try refreshing the page.';
  } else if (message.includes('No analysis')) {
    suggestion = 'Scroll down to load more content.';
  } else if (message.includes('No active tab')) {
    suggestion = 'Open a webpage first.';
  }
  
  safeHTML(contentEl, `
    <div class="status">
      <div class="indicator">${NEUTRAL_SVG}</div>
      <div class="sentiment-label">Unable to Analyze</div>
      <div class="confidence">${message}</div>
      ${suggestion ? `<div class="confidence" style="margin-top: 8px; opacity: 0.7;">💡 ${suggestion}</div>` : ''}
    </div>
  `);

  requestAnimationFrame(updateContentHeight);

  scheduleRetry();
}

let retryTimer = null;
let isErrorState = false;
let lastErrorMessage = '';
let autoRetryDisabled = false;
let userHasScrolled = false;

function scheduleRetry(delay = 4000) {
  if (autoRetryDisabled || userHasScrolled) return;
  isErrorState = true;
  if (retryTimer) {
    clearTimeout(retryTimer);
  }
  retryTimer = setTimeout(() => {
    init();
  }, delay);
}

function clearRetry() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function markInteraction() {
  // If we are in error state, stop retrying
  if (isErrorState && !autoRetryDisabled) {
     userHasScrolled = true;
     autoRetryDisabled = true;
     clearRetry();
  }
}

/**
 * Show a clear message when the current site is in the user's disabled list.
 * Unlike showError(), this does NOT schedule retries.
 */
function renderDisabled(hostname) {
  const contentEl = document.getElementById('content');
  const headerLogo = document.getElementById('headerLogo');
  clearRetry();
  isErrorState = false;
  autoRetryDisabled = true;
  siteIsDisabled = true;

  if (headerLogo) {
    safeHTML(headerLogo, `<img src="${ICON_URL}" alt="MX" width="32" height="32" />`);
  }

  safeHTML(contentEl, `
    <div class="status">
      <div class="indicator">${NEUTRAL_SVG}</div>
      <div class="sentiment-label">Disabled on This Site</div>
      <div class="confidence">MX is disabled on ${escapeHtml(hostname)}</div>
      <div class="confidence" style="margin-top: 8px; opacity: 0.7;">\uD83D\uDCA1 To re-enable, click \u201CRe-enable on this site\u201D below, or go to Settings \u2192 Disabled Sites.</div>
    </div>
  `);

  requestAnimationFrame(updateContentHeight);
}

// Request analysis from content script
async function init() {
  try {
    const params = new URLSearchParams(window.location.search || '');
    if (params.has('demo')) {
      const demoType = params.get('demo');
      const demoBase = {
        sentiment: 'positive',
        intensity: 0.35,
        confidence: 'high',
        wordCount: 760,
        isManipulative: false,
        pageTitle: 'Example Article — Great News for Everyone',
        pageHost: 'example.com',
        toneSignals: {
          positive: {
            admiration: { count: 5, matches: ['amazing', 'brilliant', 'outstanding'] },
            warmth: { count: 7, matches: ['caring', 'compassionate', 'generous', 'grateful'] },
            optimism: { count: 4, matches: ['hopeful', 'promising', 'improving'] },
            celebration: { count: 3, matches: ['happy', 'delightful', 'enjoyed'] }
          },
          negative: {
            hostility: { count: 0, matches: [] },
            alarm: { count: 1, matches: ['risk'] },
            distress: { count: 2, matches: ['worried', 'anxious'] },
            contempt: { count: 0, matches: [] }
          }
        }
      };

      if (demoType === 'manipulation') {
        renderAnalysis({
          ...demoBase,
          sentiment: 'negative',
          intensity: 0.6,
          confidence: 'high',
          wordCount: 760,
          isManipulative: true,
          manipulation: {
            fear: 3,
            fearMatches: ['terrifying', 'deadly', 'panic'],
            divisive: 5,
            divisiveMatches: ['enemy', 'traitor', 'radical', 'extreme', 'them'],
            urgency: 2,
            urgencyMatches: ['act now', 'running out'],
            emotional: 4,
            emotionalMatches: ['outrageous', 'shocking', 'devastating', 'heartbreaking']
          },
          toneSignals: {
            positive: {
              admiration: { count: 1, matches: ['remarkable'] },
              warmth: { count: 0, matches: [] },
              optimism: { count: 0, matches: [] },
              celebration: { count: 0, matches: [] }
            },
            negative: {
              hostility: { count: 8, matches: ['attack', 'hostile', 'violent', 'aggressive', 'brutal'] },
              alarm: { count: 12, matches: ['crisis', 'danger', 'threat', 'catastrophic', 'emergency', 'collapse'] },
              distress: { count: 5, matches: ['suffering', 'victim', 'pain', 'trauma'] },
              contempt: { count: 3, matches: ['corrupt', 'disgraceful', 'fraud'] }
            }
          }
        });
      } else {
        renderAnalysis(demoBase);
      }
      return;
    }

    // Determine which tab to query
    const tab = await getTargetTab();
    if (!tab?.id) {
      showError('No active tab');
      return;
    }

    // Check if this site is in the user's disabled list
    if (tab.url) {
      try {
        const tabHostname = new URL(tab.url).hostname;
        const stored = await chrome.storage.sync.get(['disabledSites']);
        const sitesArray = parseDisabledSites(stored.disabledSites || '');
        if (sitesArray.includes(tabHostname)) {
          renderDisabled(tabHostname);
          return;
        }
      } catch (_) { /* URL parse error — continue normally */ }
    }
    
    // Try to get analysis from the page
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getAnalysis' });
    
    if (response && response.analysis) {
      response.analysis.pageTitle = tab.title || '';
      try { response.analysis.pageHost = new URL(tab.url).hostname; } catch { response.analysis.pageHost = ''; }
      renderAnalysis(response.analysis);
    } else {
      showError('No analysis available for this page');
    }
  } catch (error) {
    console.error('Popup error during init:', error);
    showError('Could not connect to page');
  }
}

// ── UI Interaction Sounds (Web Audio API) ──────────────────────
let _audioCtx = null;
/**
 * Play a subtle UI interaction sound using oscillator synthesis.
 * @param {number} freq - Frequency in Hz (default 880)
 * @param {number} duration - Duration in seconds (default 0.04)
 * @param {string} type - Oscillator type: sine, triangle, square (default 'sine')
 * @param {number} volume - Gain 0-1 (default 0.06)
 */
function playUISound(freq = 880, duration = 0.04, type = 'sine', volume = 0.06) {
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (_audioCtx.state === 'suspended') _audioCtx.resume();
    const t = _audioCtx.currentTime;
    const osc = _audioCtx.createOscillator();
    const gain = _audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(_audioCtx.destination);
    osc.start(t);
    osc.stop(t + duration);
  } catch { /* audio unavailable — silent fallback */ }
}

/** Soft tap sound for chip activation */
function soundTap() { playUISound(1200, 0.035, 'sine', 0.05); }
/** Slightly lower tap for deactivation */
function soundUntap() { playUISound(800, 0.03, 'sine', 0.04); }
/** Subtle click for button presses */
function soundClick() { playUISound(660, 0.05, 'triangle', 0.04); }

// ── Performance: active-chip state tracking ────────────────────
let _activeChipKey = null;

/**
 * Deactivate whatever chip is currently active (by data-key).
 * Uses direct querySelector by key — no querySelectorAll loops.
 */
function deactivateChip(container) {
  if (!_activeChipKey) return;
  const k = _activeChipKey;
  _activeChipKey = null;
  const chip = container.querySelector(`.legend-chip[data-key="${k}"]`);
  if (chip) chip.classList.remove('active');
  const seg = container.querySelector(`.donut-seg[data-key="${k}"]`);
  if (seg) seg.classList.remove('active');
  const detail = container.querySelector(`.chip-detail[data-key="${k}"]`);
  if (detail) detail.classList.remove('open');
}

/**
 * Activate a chip by data-key.
 */
function activateChip(container, key) {
  _activeChipKey = key;
  const chip = container.querySelector(`.legend-chip[data-key="${key}"]`);
  if (chip) chip.classList.add('active');
  const seg = container.querySelector(`.donut-seg[data-key="${key}"]`);
  if (seg) seg.classList.add('active');
  const detail = container.querySelector(`.chip-detail[data-key="${key}"]`);
  if (detail) detail.classList.add('open');
}

// Initialize when popup opens
document.addEventListener('DOMContentLoaded', () => {
  init();

  const contentEl = document.getElementById('content');

  updateContentHeight();
  window.addEventListener('resize', updateContentHeight);
  if (contentEl) {
    // Detect any interaction that suggests the user is reading/scrolling
    ['scroll', 'wheel', 'touchmove', 'mousedown', 'keydown'].forEach(evt => {
      contentEl.addEventListener(evt, markInteraction, { passive: true });
    });
    // Toggle drill-down on legend chip or donut segment click
    contentEl.addEventListener('click', (e) => {
      const chip = e.target.closest('.legend-chip.has-detail');
      const seg = e.target.closest('.donut-seg');
      let targetKey = null;

      if (chip) {
        targetKey = chip.dataset.key;
      } else if (seg) {
        targetKey = seg.dataset.key;
      }

      if (!targetKey) return;

      if (targetKey === _activeChipKey) {
        // Toggle off — deactivate current
        deactivateChip(contentEl);
        soundUntap();
      } else {
        // Switch — deactivate old, activate new
        deactivateChip(contentEl);
        activateChip(contentEl, targetKey);
        soundTap();
      }

      requestAnimationFrame(updateContentHeight);
    });
  }
  
  // Disable site button handler
  document.getElementById('disableSiteBtn').addEventListener('click', async () => {
    soundClick();
    const btn = document.getElementById('disableSiteBtn');
    
    try {
      const tab = await getTargetTab();
      if (!tab?.url) return;
      
      const url = new URL(tab.url);
      if (!url.protocol.startsWith('http')) return;
      const hostname = url.hostname;
      
      // Get current settings
      const stored = await chrome.storage.sync.get(['disabledSites']);
      const disabledSites = stored.disabledSites || '';
      const sitesArray = parseDisabledSites(disabledSites);
      
      // Check if already disabled
      if (sitesArray.includes(hostname)) {
        // Re-enable the site
        const updatedSites = sitesArray.filter(s => s !== hostname);
        await chrome.storage.sync.set({ disabledSites: updatedSites.join('\n') });
        safeHTML(btn, `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M7 7l10 10"></path>
        </svg><span>Disable on this site</span>`);
        btn.title = 'Disable MX on this site';
        siteIsDisabled = false;
        _suppressLiveUpdates = true;
        // Re-init popup after content script has finished re-analyzing
        setTimeout(() => {
          _suppressLiveUpdates = false;
          init();
        }, 1200);
      } else {
        // Disable the site
        sitesArray.push(hostname);
        await chrome.storage.sync.set({ disabledSites: sitesArray.join('\n') });
        safeHTML(btn, `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M7 7l10 10"></path>
          <path d="M12 4a8 8 0 1 1-6.36 3.14"></path>
          <path d="M6 4v4h4"></path>
        </svg><span>Re-enable on this site</span>`);
        btn.title = 'Re-enable MX on this site';
        // Switch popup content to disabled view immediately
        renderDisabled(hostname);
      }
    } catch (e) {
      console.error('Disable site error:', e);
    }
  });
  
  // Check if current site is disabled and update button
  (async () => {
    try {
      const tab = await getTargetTab();
      if (!tab?.url) return;
      
      const url = new URL(tab.url);
      const hostname = url.hostname;
      
      const stored = await chrome.storage.sync.get(['disabledSites']);
      const disabledSites = stored.disabledSites || '';
      const sitesArray = parseDisabledSites(disabledSites);
      
      const btn = document.getElementById('disableSiteBtn');
      if (sitesArray.includes(hostname)) {
        safeHTML(btn, `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M7 7l10 10"></path>
          <path d="M12 4a8 8 0 1 1-6.36 3.14"></path>
          <path d="M6 4v4h4"></path>
        </svg><span>Re-enable on this site</span>`);
        btn.title = 'Re-enable MX on this site';
      }
    } catch (e) {
      // Ignore URL errors (like chrome:// pages)
    }
  })();
  
  // Settings button handler
  document.getElementById('settingsBtn').addEventListener('click', () => {
    soundClick();
    chrome.runtime.openOptionsPage();
  });
  
  // Refresh button handler
  document.getElementById('refreshBtn').addEventListener('click', async () => {
    soundClick();
    const btn = document.getElementById('refreshBtn');
    btn.classList.add('loading');
    
    try {
      const tab = await getTargetTab();
      if (tab?.id) {
        // Request re-analysis
        await chrome.tabs.sendMessage(tab.id, { action: 'reanalyze' });
        // Wait a bit for analysis to complete, then refresh
        await new Promise(r => setTimeout(r, 1000));
        init();
      }
    } catch (e) {
      console.error('Refresh error:', e);
    } finally {
      btn.classList.remove('loading');
    }
  });
  
  // Help button handler
  document.getElementById('helpBtn').addEventListener('click', () => {
    soundClick();
    chrome.tabs.create({ url: chrome.runtime.getURL('help/help.html') });
  });
});

// Live updates from content script while popup is open
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'analysisUpdated' && message.analysis && !_suppressLiveUpdates) {
    if (sender.tab) {
      message.analysis.pageTitle = sender.tab.title || '';
      try { message.analysis.pageHost = new URL(sender.tab.url).hostname; } catch { message.analysis.pageHost = ''; }
    }
    renderAnalysis(message.analysis);
    sendResponse({ success: true });
  }
});
