/**
 * Manipulation Index (MX) Content Script
 * Main entry point for the MX extension
 * Analyzes visible page content and displays manipulation index
 */

import { extractVisibleTextSample } from '../analyzer/visibleTextExtractor.js';
import { analyzeSegments } from '../analyzer/sentimentAnalyzer.js';
import { MX } from '../ui/mx.js';
import { devLog } from '../utils/devLog.js';

// DEFAULT_SETTINGS is provided by shared.js (bundled before content.js)

// Current settings
let settings = { ...DEFAULT_SETTINGS };

// Analysis configuration
const CONFIG = {
  // Initial delay before first analysis (ms)
  initialDelay: 1500,
  // Debounce delay for DOM mutation events (ms)
  debounceDelay: 300,
  // Debounce delay for scroll events (ms) — higher to avoid excessive re-analysis
  scrollDebounceDelay: 800,
  // Minimum scroll distance (px) before triggering re-analysis
  scrollThreshold: 400,
  // Minimum interval between analyses (ms)
  minAnalysisInterval: 1000,
  // Maximum words to analyze per cycle (safety cap for extreme pages —
  // real pages rarely exceed 10K; 50K keeps analysis under ~250ms)
  maxWords: 50000
};

// State
let lastAnalysisTime = 0;
let analysisTimeout = null;
let isAnalyzing = false;

/**
 * Check if browser is in fullscreen mode
 * @returns {boolean}
 */
function getFullscreenElement() {
  return document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement ||
    null;
}

function isFullscreenActive() {
  return Boolean(
    getFullscreenElement() ||
    window.fullScreen ||
    document.mozFullScreen ||
    document.webkitIsFullScreen
  );
}

/**
 * Hide indicator when a fullscreen video is active
 */
function handleFullscreenChange() {
  if (isFullscreenActive()) {
    MX.hideTooltip?.();
    MX.hide();
  } else {
    // Restore indicator visibility based on settings
    applySettings();
  }
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
      settings = { ...DEFAULT_SETTINGS, ...stored };
      devLog('info', 'Content', 'Loaded settings', settings);
    }
  } catch (e) {
    devLog('warn', 'Content', 'Could not load settings', e.message);
  }
  return settings;
}

/**
 * Check if current site is disabled
 */
function isSiteDisabled() {
  if (!settings.disabledSites) return false;
  const hostname = window.location.hostname;
  const disabledList = parseDisabledSites(settings.disabledSites);
  return disabledList.some(site => hostname === site || hostname.endsWith('.' + site));
}

/**
 * Apply settings to the UI
 */
function applySettings() {
  if (!settings.showIndicator || isSiteDisabled()) {
    MX.hide();
    return false;
  }
  if (isFullscreenActive()) {
    MX.hide();
    return false;
  }
  
  // Apply settings (size, position, opacity) BEFORE showing to prevent flash
  MX.applySettings({
    position: settings.indicatorPosition,
    size: settings.indicatorSize,
    opacity: settings.indicatorOpacity
  });
  if (settings.showOnPageIndicator) {
    MX.show();
  } else {
    MX.hide();
  }
  
  return true;
}

/**
 * Perform sentiment analysis on visible content
 */
function analyzeVisibleContent() {
  if (isAnalyzing) return;
  
  const now = Date.now();
  if (now - lastAnalysisTime < CONFIG.minAnalysisInterval) {
    // Too soon, schedule for later
    scheduleAnalysis(CONFIG.minAnalysisInterval - (now - lastAnalysisTime));
    return;
  }
  
  isAnalyzing = true;
  lastAnalysisTime = now;
  
  try {
    devLog('info', 'Content', 'Starting sentiment analysis');
    
    // Extract visible text with segment data
    const textData = extractVisibleTextSample(CONFIG.maxWords);
    devLog('info', 'Content', `Extracted ${textData.wordCount} words from ${textData.nodeCount} segments`);
    
    if (textData.wordCount < 10) {
      // Not enough content — keep indicator at last position
      // (more content may arrive during SPA navigation)
      devLog('info', 'Content', 'Not enough text, keeping current indicator');
      isAnalyzing = false;
      return;
    }
    
    // Analyze sentiment using segment-based analysis (with prominence weighting)
    const analysis = analyzeSegments(textData, { sensitivity: settings.sensitivity });
    devLog('info', 'Content', `Sentiment: ${analysis.sentiment}, Confidence: ${analysis.confidence}`);
    
    // If manipulation alerts are disabled, downgrade manipulative to negative-strong
    if (!settings.manipulationAlerts && analysis.isManipulative) {
      analysis.isManipulative = false;
      analysis.sentiment = 'negative';
      analysis.description = 'Strongly negative content';
    }
    
    // Log quote info if significant
    if (textData.quotedRatio > 0.1) {
      devLog('info', 'Content', `Quoted content: ${(textData.quotedRatio * 100).toFixed(1)}%`);
    }
    
    // Update UI (also notifies background to update extension icon)
    MX.update(analysis);

    // Notify popup (if open) with latest analysis
    if (chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'analysisUpdated',
        analysis: {
          ...analysis,
          indicatorType: resolveIndicatorType(analysis)
        }
      }).catch(() => {});
    }
    
  } catch (error) {
    devLog('error', 'Content', 'Analysis failed', { error: error.message });
    MX.showError('Analysis failed');
  } finally {
    isAnalyzing = false;
  }
}

/**
 * Schedule analysis with debouncing
 * @param {number} delay
 */
function scheduleAnalysis(delay = CONFIG.debounceDelay) {
  if (analysisTimeout) {
    clearTimeout(analysisTimeout);
  }
  // Show loading state immediately so needle hides during re-analysis
  if (MX.showLoading) MX.showLoading();
  analysisTimeout = setTimeout(analyzeVisibleContent, delay);
}

/**
 * Initialize the extension
 */
async function init() {
  devLog('info', 'Content', 'MX initializing');
  
  // Clean up stale indicator from a previous extension version (extension update
  // creates a new content-script world, so window.__mxInjected is gone but the
  // old DOM element lingers)
  const staleRoot = document.getElementById('mx-root');
  if (staleRoot) {
    staleRoot.remove();
    devLog('info', 'Content', 'Removed stale indicator from previous version');
  }

  // Prevent double injection within the same content-script context
  if (window.__mxInjected) {
    devLog('info', 'Content', 'Already injected');
    return;
  }
  window.__mxInjected = true;
  
  // Load settings first
  await loadSettings();
  
  // Initialize UI
  MX.init();
  
  // Fetch browser zoom level and apply to indicator sizing
  try {
    const resp = await chrome.runtime.sendMessage({ type: 'getZoom' });
    if (resp?.zoom) MX.setZoom(resp.zoom);
  } catch (e) {
    // Ignore — zoom defaults to 1
  }
  
  // Wait for saved drag position to load before showing (prevents position flash)
  try { await MX._dragLoaded; } catch (e) { /* ignore */ }
  
  // Apply settings (may hide indicator on disabled sites)
  const canAnalyze = applySettings();
  if (!canAnalyze) {
    devLog('info', 'Content', 'MX disabled for this site');
  }
  
  if (canAnalyze) {
    MX.showLoading();
    
    // Initial analysis after page settles
    setTimeout(() => {
      analyzeVisibleContent();
    }, CONFIG.initialDelay);
  }

  // Hide indicator when a fullscreen video is active
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('mozfullscreenchange', handleFullscreenChange);
  document.addEventListener('MSFullscreenChange', handleFullscreenChange);

  handleFullscreenChange();
  
  // Re-analyze on scroll — viewport-scoped extraction means new content
  // may enter the analysis window as the user scrolls (infinite scroll, etc.)
  let lastScrollY = window.scrollY;
  let scrollTimer = null;
  window.addEventListener('scroll', () => {
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const dy = Math.abs(window.scrollY - lastScrollY);
      if (dy >= CONFIG.scrollThreshold) {
        lastScrollY = window.scrollY;
        scheduleAnalysis(CONFIG.debounceDelay);
      }
    }, CONFIG.scrollDebounceDelay);
  }, { passive: true });
  
  // Re-analyze when DOM changes significantly (debounced)
  const observer = new MutationObserver((mutations) => {
    const isInMxRoot = (node) => {
      if (!node) return false;
      if (node.nodeType === Node.ELEMENT_NODE) {
        return node.id === 'mx-root' || node.closest?.('#mx-root');
      }
      if (node.nodeType === Node.TEXT_NODE) {
        return node.parentElement?.closest?.('#mx-root');
      }
      return false;
    };

    // Only trigger on significant changes (new/removed nodes or text changes in main content)
    const hasSignificantChanges = mutations.some(m => {
      // Ignore changes caused by the MX UI itself
      if (isInMxRoot(m.target)) return false;
      if (m.addedNodes.length > 0) {
        const addedInMx = Array.from(m.addedNodes).some(isInMxRoot);
        if (addedInMx) return false;
      }
      if (m.removedNodes.length > 0) {
        const removedInMx = Array.from(m.removedNodes).some(isInMxRoot);
        if (removedInMx) return false;
      }

      // Check for structural changes
      if (m.addedNodes.length > 0 || m.removedNodes.length > 0) return true;
      // Check for text content changes in main content areas
      if (m.type === 'characterData' || m.type === 'childList') {
        const target = m.target;
        if (target && target.parentElement) {
          const parent = target.parentElement;
          // Prioritize main content areas (important for YouTube Shorts, etc.)
          if (parent.matches('article, main, [role="main"], .content, #content, #shorts-container, ytd-reel-video-renderer')) {
            return true;
          }
        }
      }
      return false;
    });
    if (hasSignificantChanges) {
      scheduleAnalysis(CONFIG.debounceDelay * 2);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    characterDataOldValue: false
  });
  
  // Listen for messages from popup and options
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getAnalysis') {
      // Return the current analysis from MX
      const analysis = MX.getCurrentAnalysis ? MX.getCurrentAnalysis() : null;
      devLog('info', 'Content', 'Popup requested analysis', {
        hasAnalysis: !!analysis,
        sentiment: analysis?.sentiment || null,
        indicatorType: analysis?.indicatorType || null
      });
      sendResponse({ analysis });
      return false;
    } else if (message.action === 'reanalyze') {
      // Trigger fresh analysis
      devLog('info', 'Content', 'Manual re-analysis requested');
      analyzeVisibleContent();
      sendResponse({ success: true });
      return false;
    } else if (message.type === 'zoomChanged') {
      // Browser zoom level changed — update indicator size
      if (message.zoom) MX.setZoom(message.zoom);
      return false;
    }
    return false;
  });

  // Sync settings and drag position across tabs
  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'sync') return;
      let shouldApply = false;
      let shouldReanalyze = false;

      if (changes.indicatorDragPosition) {
        MX.setDragPosition(changes.indicatorDragPosition.newValue);
        shouldApply = true;
      }

      const settingKeys = [
        'showIndicator',
        'showOnPageIndicator',
        'indicatorPosition',
        'indicatorSize',
        'indicatorOpacity',
        'manipulationAlerts',
        'sensitivity',
        'disabledSites'
      ];

      // Settings that affect analysis results (not just UI)
      const analysisKeys = ['sensitivity', 'manipulationAlerts'];

      settingKeys.forEach((key) => {
        if (changes[key]) {
          settings[key] = changes[key].newValue;
          shouldApply = true;
          if (analysisKeys.includes(key)) {
            shouldReanalyze = true;
          }
        }
      });

      // When position setting changes, clear saved drag position so
      // the selected corner takes effect immediately
      if (changes.indicatorPosition) {
        MX.clearDragPosition();
      }

      if (shouldApply) {
        const canAnalyze = applySettings();
        // If disabledSites changed and site is now enabled, re-analyze
        if (changes.disabledSites && canAnalyze) {
          MX.showLoading();
          shouldReanalyze = true;
        }
      }
      if (shouldReanalyze) {
        scheduleAnalysis(100);
      }
    });
  }
  
  devLog('info', 'Content', 'MX initialized');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
