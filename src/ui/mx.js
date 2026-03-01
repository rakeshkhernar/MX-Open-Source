/**
 * Manipulation Index (MX) UI Module
 * Creates and manages the floating MX indicator
 */

import { 
  getIndicatorSVG, 
  errorSVG, 
  neutralSVG
} from './svgIndicators.js';

/** Safely set element HTML content without triggering AMO linter warnings */
function safeHTML(el, html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  el.replaceChildren(...doc.body.childNodes);
}

const MX = {
  root: null,
  face: null,
  tooltip: null,
  isInitialized: false,
  currentIndicatorType: 'neutral',
  currentSentiment: null,
  dragPosition: null,
  dragPadding: 8,
  isDragging: false,
  dragPointerId: null,
  dragStart: null,
  /** Browser zoom factor (1.0 = 100%, 1.5 = 150%, etc.) */
  browserZoom: 1,
  dragOffset: null,
  dragMoveHandler: null,
  dragEndHandler: null,
  suppressNextDocumentClick: false,
  dragRestoreUserSelect: null,
  
  /**
   * Initialize the MX UI
   */
  init() {
    if (this.isInitialized) return;
    
    // Create host element — Shadow DOM provides complete style isolation from host page
    this.root = document.createElement('div');
    this.root.id = 'mx-root';
    this.root.style.cssText = 'position:fixed;top:0;left:0;z-index:2147483647;pointer-events:none;';
    
    // Create closed shadow root (page scripts cannot access our internals)
    this.shadow = this.root.attachShadow({ mode: 'closed' });
    
    // Add styles inside shadow
    const style = document.createElement('style');
    style.textContent = this.getStyles();
    this.shadow.appendChild(style);
    
    // Add template inside shadow
    const tplDoc = new DOMParser().parseFromString(this.getTemplate(), 'text/html');
    while (tplDoc.body.firstChild) this.shadow.appendChild(tplDoc.body.firstChild);
    
    document.body.appendChild(this.root);

    // Prevent any initial flash before settings apply
    this.root.style.visibility = 'hidden';
    
    // Cache elements (inside shadow)
    this.face = this.shadow.querySelector('.mf-face');
    this.tooltip = this.shadow.querySelector('.mf-tooltip');
    this._dragLoaded = this.loadDragPosition();
    
    // Drag and click handling via pointer events (unified approach)
    this.face.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault(); // Prevent page selection/drag
      e.stopPropagation();
      this.startDrag(e);
    });
    
    // Add event listeners - keyboard accessibility
    this.face.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.handleClick();
      } else if (e.key === 'Escape') {
        this.hideTooltip();
        this.face.setAttribute('aria-expanded', 'false');
      }
    });
    
    // Close tooltip when clicking outside (Shadow DOM retargets e.target to host)
    this._documentClickHandler = (e) => {
      if (this.suppressNextDocumentClick) {
        this.suppressNextDocumentClick = false;
        return;
      }
      if (this.tooltip && this.tooltip.classList.contains('visible')) {
        // With Shadow DOM, clicks inside the shadow have e.target === this.root
        if (!this.root.contains(e.target)) {
          this.hideTooltip();
        }
      }
    };
    document.addEventListener('click', this._documentClickHandler);
    
    // Prevent tooltip clicks from closing it
    if (this.tooltip) {
      this.tooltip.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      // "See More" button opens the full popup analysis
      const seeMoreBtn = this.tooltip.querySelector('.mf-see-more');
      if (seeMoreBtn) {
        seeMoreBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openFullAnalysis();
        });
      }

      // "Disable on this site" button
      const disableBtn = this.tooltip.querySelector('.mf-disable-site');
      if (disableBtn) {
        disableBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.disableOnCurrentSite();
        });
      }
    }

    // Hide tooltip on scroll
    this._scrollHandler = () => {
      if (this.tooltip && this.tooltip.classList.contains('visible')) {
        this.hideTooltip();
      }
    };
    window.addEventListener('scroll', this._scrollHandler, { passive: true, capture: true });
    
    // Note: Removed focus/blur auto-show/hide to prevent conflict with click handler
    // Keyboard users can still use Enter/Space keys to toggle tooltip
    
    // Handle responsive sizing
    this.updateSize();
    this._resizeHandler = () => {
      this.updateSize();
      this.clampToViewport();
      if (this.tooltip && this.tooltip.classList.contains('visible')) {
        this.positionTooltip();
      }
    };
    window.addEventListener('resize', this._resizeHandler);
    
    this.isInitialized = true;
  },
  
  /**
   * Get the HTML template
   * @returns {string}
   */
  getTemplate() {
    return `
      <div class="mf-container mf-hidden">
        <button class="mf-face" 
                role="button" 
                aria-label="Page sentiment indicator - click for details"
                aria-expanded="false"
                aria-haspopup="true"
                tabindex="0">
          <div class="mf-indicator" aria-hidden="true">${neutralSVG(32)}</div>
        </button>
        <div class="mf-tooltip" 
             role="tooltip" 
             aria-hidden="true"
             id="mx-tooltip">
          <div class="mf-tooltip-content">
            <div class="mf-tooltip-indicator" aria-hidden="true">${neutralSVG(48)}</div>
            <div class="mf-tooltip-text">Analyzing...</div>
            <div class="mf-tooltip-details"></div>
            <div class="mf-tooltip-confidence" aria-label="Confidence level">
              <div class="mf-tooltip-confidence-bar" style="width: 0%"></div>
            </div>
            <div class="mf-tooltip-actions">
              <button class="mf-see-more" aria-label="Open MX Report" title="MX Report">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/>
                </svg>
              </button>
              <button class="mf-disable-site" aria-label="Disable on this site" title="Disable on this site">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="9"/><path d="M7 7l10 10"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },
  
  /**
   * Get component styles
   * @returns {string}
   */
  getStyles() {
    return `
      :host {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        --mf-opacity: 0.8;
      }
      
      *, *::before, *::after {
        box-sizing: border-box;
      }
      
      .mf-container {
        position: fixed;
        bottom: 12px;
        right: 12px;
        pointer-events: auto;
        user-select: none;
        opacity: 1;
        transition: opacity 0.2s ease;
        will-change: transform;
        isolation: isolate;
        transform: translateZ(0);
      }

      .mf-container.mf-hidden {
        opacity: 0;
        pointer-events: none;
      }
      
      .mf-face {
        width: var(--mf-size, 48px);
        height: var(--mf-size, 48px);
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent !important;
        opacity: var(--mf-opacity, 0.8) !important;
        border: none !important;
        border-radius: 50% !important;
        overflow: hidden !important;
        position: relative;
        box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.85), 0 2px 6px rgba(0, 0, 0, 0.25) !important;
        cursor: pointer !important;
        transition: box-shadow 0.2s ease, outline 0.1s ease !important;
        padding: 0 !important;
        outline: none !important;
        filter: none !important;
        backdrop-filter: none !important;
        touch-action: none;
      }
      
      .mf-face:hover {
        box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.85), 0 4px 10px rgba(0, 0, 0, 0.3) !important;
      }
      
      .mf-face:focus-visible {
        outline: 3px solid #3b82f6 !important;
        outline-offset: 2px !important;
      }
      
      .mf-indicator {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: none !important;
        transform-origin: center;
      }
      
      .mf-indicator svg {
        width: 100% !important;
        height: 100% !important;
        filter: none !important;
        transform-origin: center;
        transition: opacity 0.5s ease;
      }
      
      .mf-tooltip {
        position: absolute;
        top: calc(var(--mf-size, 48px) + 8px);
        left: 0;
        min-width: 200px;
        max-width: 280px;
        max-height: 400px !important;
        overflow-y: auto !important;
        background: rgba(30, 30, 30, 0.95) !important;
        color: #fff !important;
        border-radius: 10px !important;
        padding: 12px 14px !important;
        font-size: 13px !important;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-8px);
        transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
        filter: none !important;
        backdrop-filter: blur(8px) !important;
      }
      
      .mf-tooltip.visible {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }
      
      .mf-tooltip-content {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      
      .mf-tooltip-indicator {
        width: 48px;
        height: 48px;
        margin: 0 auto 8px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .mf-tooltip-indicator svg {
        width: 100%;
        height: 100%;
      }
      
      .mf-tooltip-text {
        font-weight: 600;
        font-size: 14px;
        text-align: center;
        color: #fff;
      }
      
      .mf-tooltip-details {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.7);
        text-align: center;
        line-height: 1.4;
      }

      .mf-tooltip-actions {
        display: flex;
        gap: 4px;
        margin-top: 4px;
      }

      .mf-see-more, .mf-disable-site {
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 1;
        height: 28px;
        border: none;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease;
        padding: 0;
      }

      .mf-see-more:hover {
        background: rgba(59, 130, 246, 0.3);
        color: #fff;
      }

      .mf-disable-site:hover {
        background: rgba(239, 68, 68, 0.3);
        color: #fff;
      }

      .mf-see-more svg, .mf-disable-site svg {
        width: 16px;
        height: 16px;
      }
      
      /* Manipulative content warning */
      .mf-face.manipulative {
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.5), 0 4px 20px rgba(239, 68, 68, 0.4) !important;
        animation: mf-pulse-warning 2s ease-in-out infinite;
      }
      
      @keyframes mf-pulse-warning {
        0%, 100% { 
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.4), 0 4px 20px rgba(239, 68, 68, 0.3);
        }
        50% { 
          box-shadow: 0 0 0 5px rgba(239, 68, 68, 0.3), 0 4px 24px rgba(239, 68, 68, 0.4);
        }
      }
      
      /* Loading state — dimmed gauge arcs, no animation */
      .mf-face.loading .mf-indicator {
        animation: none;
      }

      .mf-face.loading .mf-gauge-content {
        opacity: 0.7;
      }
      
      /* Entry animation */
      .mf-container {
        animation: mx-fade-in 0.5s ease-out;
      }
      
      /* Confidence indicator bar */
      .mf-tooltip-confidence {
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        margin-top: 8px;
        overflow: hidden;
      }
      
      .mf-tooltip-confidence-bar {
        height: 100%;
        background: linear-gradient(90deg, #3b82f6, #22c55e);
        border-radius: 2px;
        transition: width 0.3s ease;
      }
      
      /* Dark mode - keep consistent dark background */
      @media (prefers-color-scheme: dark) {
        .mf-face {
          background: rgba(30, 30, 30, 0.75) !important;
          border-color: rgba(255, 255, 255, 0.15);
        }
      }
      
      /* Reduced motion */
      @media (prefers-reduced-motion: reduce) {
        .mf-face, .mf-indicator, .mf-tooltip, .mf-container {
          transition: none;
          animation: none;
        }
        
        .mf-face.loading .mf-indicator,
        .mf-face.manipulative {
          animation: none;
        }
      }

      /* ── Full-analysis modal ── */
      .mx-modal-backdrop {
        position: fixed !important;
        inset: 0 !important;
        z-index: 2147483647 !important;
        background: rgba(0, 0, 0, 0.55) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        pointer-events: auto !important;
        animation: mx-fade-in 0.2s ease !important;
      }
      @keyframes mx-fade-in { from { opacity: 0; } to { opacity: 1; } }

      .mx-modal {
        width: 380px !important;
        max-width: 92vw !important;
        max-height: 85vh !important;
        background: #1F2937 !important;
        color: #F9FAFB !important;
        border-radius: 16px !important;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5) !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
        animation: mx-slide-up 0.25s ease !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
      }
      @keyframes mx-slide-up { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }

      .mx-modal-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 16px 16px 12px !important;
        border-bottom: 1px solid #374151 !important;
        flex-shrink: 0 !important;
      }
      .mx-modal-header span {
        font-weight: 700 !important;
        font-size: 15px !important;
        letter-spacing: -0.01em !important;
        color: #F9FAFB !important;
      }
      .mx-modal-close {
        width: 28px !important; height: 28px !important;
        min-width: 28px !important; min-height: 28px !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
        border: none !important; background: rgba(255,255,255,0.08) !important;
        color: #9CA3AF !important; border-radius: 8px !important; cursor: pointer !important;
        transition: background 0.15s, color 0.15s !important;
        padding: 0 !important; margin: 0 !important;
        box-sizing: border-box !important;
        flex-shrink: 0 !important;
        outline: none !important;
      }
      .mx-modal-close:hover { background: rgba(255,255,255,0.15) !important; color: #fff !important; }
      .mx-modal-close svg {
        width: 16px !important; height: 16px !important;
        display: block !important;
        pointer-events: none !important;
      }

      .mx-modal-body {
        padding: 16px !important;
        overflow-y: auto !important;
        overflow-anchor: none !important;
        flex: 1 !important;
      }

      .mx-modal-footer {
        display: flex !important;
        justify-content: center !important;
        gap: 8px !important;
        padding: 10px 16px !important;
        border-top: 1px solid rgba(255,255,255,0.08) !important;
        flex-shrink: 0 !important;
        pointer-events: auto !important;
        position: relative !important;
        z-index: 10 !important;
      }
      .mx-modal-footer button {
        background: rgba(255,255,255,0.06) !important;
        color: #9CA3AF !important;
        font-size: 12px !important;
        font-family: inherit !important;
        text-decoration: none !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 5px !important;
        padding: 6px 12px !important;
        border: 1px solid rgba(255,255,255,0.08) !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        pointer-events: auto !important;
        transition: background 0.15s ease, color 0.15s ease !important;
      }
      .mx-modal-footer button:hover {
        background: rgba(255,255,255,0.12) !important;
        color: #E5E7EB !important;
      }
      .mx-modal-footer svg {
        width: 13px !important;
        height: 13px !important;
        display: inline-block !important;
        flex-shrink: 0 !important;
      }

      /* Status section */
      .mx-status {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        text-align: center !important;
        gap: 4px !important;
        margin-bottom: 16px !important;
      }
      .mx-status-indicator { width: 56px !important; height: 56px !important; }
      .mx-status-indicator svg { width: 100% !important; height: 100% !important; }
      .mx-status-label { font-weight: 700 !important; font-size: 16px !important; color: #F9FAFB !important; }
      .mx-status-meta { font-size: 12px !important; color: #9CA3AF !important; }
      .mx-status-page {
        display: flex !important; align-items: center !important; justify-content: center !important; gap: 6px !important;
        margin-top: 6px !important; max-width: 100% !important;
      }
      .mx-page-title {
        font-size: 11px !important; color: #9CA3AF !important; opacity: 0.8 !important;
        overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important;
        max-width: 240px !important;
      }
      .mx-page-title-text {
        display: inline !important;
      }
      .mx-page-title:hover {
        text-overflow: clip !important;
      }
      .mx-page-title:hover .mx-page-title-text {
        display: inline-block !important;
        animation: mx-scroll-title 6s linear 0.3s infinite !important;
      }
      @keyframes mx-scroll-title {
        0%, 10%  { transform: translateX(0); }
        45%, 55% { transform: translateX(min(0px, calc(-100% + 240px))); }
        90%, 100% { transform: translateX(0); }
      }
      .mx-page-host {
        font-size: 10px !important; color: #6B7280 !important;
        background: rgba(255,255,255,0.06) !important; border-radius: 4px !important;
        padding: 1px 6px !important; white-space: nowrap !important; flex-shrink: 0 !important;
      }

      /* Manipulation warning */
      .mx-manip-warn {
        display: flex !important; gap: 10px !important; align-items: flex-start !important;
        background: rgba(239,68,68,0.12) !important; border: 1px solid rgba(239,68,68,0.3) !important;
        border-radius: 10px !important; padding: 10px 12px !important; margin-bottom: 14px !important;
        font-size: 12px !important; line-height: 1.45 !important; color: #FCA5A5 !important;
      }
      .mx-manip-warn .icon { font-size: 18px !important; flex-shrink: 0 !important; }

      /* Neutral tone note */
      .mx-neutral-note {
        font-size: 11px !important; line-height: 1.4 !important; color: #8B949E !important;
        font-style: italic !important; margin-bottom: 14px !important; padding: 0 2px !important;
      }

      /* Donut chart */
      .mx-analysis-chart { margin-bottom: 14px !important; }
      .mx-no-signals-msg {
        display: flex !important; align-items: center !important; gap: 8px !important;
        color: #8B949E !important; font-size: 12px !important; line-height: 1.5 !important;
        padding: 6px 0 !important;
      }
      .mx-no-signals-icon { font-size: 20px !important; flex-shrink: 0 !important; }
      .mx-donut-wrapper {
        position: relative !important; width: 160px !important; height: 160px !important;
        margin: 0 auto 12px !important;
      }
      .mx-donut-svg { width: 100% !important; height: 100% !important; }
      .mx-donut-track { pointer-events: none !important; }
      .mx-donut-seg {
        transition: stroke-width 0.2s ease, opacity 0.2s ease, filter 0.2s ease !important;
        cursor: pointer !important;
        animation: mx-donut-draw 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both !important;
      }
      .mx-donut-seg:hover {
        stroke-width: 22 !important; filter: drop-shadow(0 0 4px rgba(255,255,255,0.3)) !important;
      }
      .mx-donut-seg.active {
        stroke-width: 24 !important; filter: drop-shadow(0 0 6px rgba(255,255,255,0.4)) !important;
      }
      @keyframes mx-donut-draw { from { stroke-dasharray: 0 999; } }
      .mx-donut-center {
        position: absolute !important; top: 50% !important; left: 50% !important;
        transform: translate(-50%, -50%) !important; text-align: center !important;
        pointer-events: none !important;
      }
      .mx-donut-total {
        display: block !important; font-size: 24px !important; font-weight: 800 !important; color: #F9FAFB !important; line-height: 1 !important;
      }
      .mx-donut-label {
        display: block !important; font-size: 10px !important; color: #9CA3AF !important;
        font-weight: 600 !important; text-transform: uppercase !important;
        letter-spacing: 0.05em !important; margin-top: 2px !important;
      }

      /* Legend groups */
      .mx-chart-legend { display: flex !important; flex-direction: column !important; gap: 8px !important; }
      .mx-legend-group-label {
        font-size: 10px !important; font-weight: 700 !important; text-transform: uppercase !important;
        letter-spacing: 0.06em !important; color: #9CA3AF !important; margin-bottom: 2px !important;
        display: flex !important; align-items: center !important; gap: 6px !important;
      }
      .mx-donut-arc-label {
        fill: rgba(255,255,255,0.92) !important; font-size: 7.5px !important; font-weight: 700 !important;
        pointer-events: none !important;
      }
      .mx-legend-chips { display: flex !important; flex-wrap: wrap !important; gap: 6px !important; }
      .mx-legend-chip {
        display: inline-flex !important; align-items: center !important; gap: 5px !important;
        padding: 4px 10px !important; border-radius: 999px !important;
        background: rgba(255,255,255,0.06) !important;
        border: 1.5px solid rgba(255,255,255,0.1) !important;
        font-size: 11px !important; font-weight: 600 !important; color: #D1D5DB !important;
        cursor: pointer !important; transition: all 0.2s ease !important; user-select: none !important;
      }
      .mx-legend-chip:hover {
        background: rgba(255,255,255,0.12) !important;
        transform: translateY(-1px) !important;
      }
      .mx-legend-chip.active {
        border-color: var(--chip-color, currentColor) !important;
        background: rgba(255,255,255,0.1) !important;
        box-shadow: 0 0 8px rgba(255,255,255,0.12) !important;
      }
      .mx-legend-chip .mx-chip-dot {
        width: 8px !important; height: 8px !important; border-radius: 50% !important; flex-shrink: 0 !important;
      }
      .mx-legend-chip .mx-chip-count { color: #9CA3AF !important; font-weight: 500 !important; }

      /* Drill-down detail */
      .mx-chip-detail {
        max-height: 0 !important; overflow: hidden !important; opacity: 0 !important;
        transition: max-height 0.35s ease, opacity 0.25s ease, margin 0.35s ease !important;
        margin: 0 !important;
      }
      .mx-chip-detail.open {
        max-height: 120px !important; opacity: 1 !important; margin-top: 6px !important; overflow-y: auto !important;
      }
      .mx-chip-detail-inner {
        display: flex !important; flex-wrap: wrap !important; gap: 4px !important;
        padding: 8px 10px !important; background: rgba(0,0,0,0.2) !important;
        border-radius: 8px !important;
        border-left: 3px solid var(--chip-color, #6B7280) !important;
      }
      .mx-chip-detail-word {
        font-size: 11px !important; padding: 2px 8px !important;
        background: rgba(255,255,255,0.08) !important; border-radius: 999px !important;
        color: #D1D5DB !important; line-height: 1.4 !important;
      }
    `;
  },
  
  /**
   * Set the browser zoom factor (from chrome.tabs.getZoom API)
   * and re-apply sizing to compensate.
   */
  setZoom(zoom) {
    if (typeof zoom !== 'number' || zoom <= 0) return;
    this.browserZoom = zoom;
    this.updateSize();
    this.applyDragPosition(); // re-derive pixel position for new viewport
  },

  /**
   * Update size based on viewport, compensating for browser zoom
   * so the indicator maintains a roughly fixed physical size.
   */
  updateSize() {
    if (!this.root) return;
    
    const vw = window.innerWidth;
    const zoom = this.browserZoom;
    
    // Responsive sizing based on viewport
    let size, indicatorSize;
    
    if (vw < 480) {
      // Mobile - smaller indicator
      size = 36;
      indicatorSize = 24;
    } else if (vw < 768) {
      // Tablet
      size = 42;
      indicatorSize = 28;
    } else {
      // Desktop
      size = 48;
      indicatorSize = 32;
    }

    // Compensate for browser zoom so the indicator stays a consistent
    // physical size.  Clamp to keep it usable at extreme zoom levels.
    size = Math.round(Math.min(64, Math.max(24, size / zoom)));
    indicatorSize = Math.round(Math.min(44, Math.max(16, indicatorSize / zoom)));
    
    this.root.style.setProperty('--mf-size', `${size}px`);
    this.root.style.setProperty('--mf-indicator-size', `${indicatorSize}px`);
  },

  /**
   * Load saved drag position (stored as percentages for zoom safety)
   */
  loadDragPosition() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        return chrome.storage.sync.get(['indicatorDragPosition']).then((stored) => {
          const parsed = stored?.indicatorDragPosition;
          if (typeof parsed?.xPct === 'number' && typeof parsed?.yPct === 'number') {
            // New percentage format
            this.dragPosition = { xPct: parsed.xPct, yPct: parsed.yPct };
            this.applyDragPosition();
          } else if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
            // Legacy pixel format — convert to percentages and re-save
            this.dragPosition = this.pixelToPercent(parsed.x, parsed.y);
            this.applyDragPosition();
            this.saveDragPosition();
          }
        }).catch(() => {
          // Ignore storage errors
        });
      }
    } catch (e) {
      // Ignore storage errors
    }
    return Promise.resolve();
  },

  /**
   * Save drag position
   */
  saveDragPosition() {
    try {
      if (this.dragPosition && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set({ indicatorDragPosition: this.dragPosition }).catch(() => {
          // Ignore storage errors
        });
      }
    } catch (e) {
      // Ignore storage errors
    }
  },

  /**
   * Clear saved drag position so the preset corner position takes effect again
   */
  clearDragPosition() {
    this.dragPosition = null;
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        chrome.storage.sync.remove('indicatorDragPosition').catch(() => {});
      }
    } catch (e) {
      // Ignore storage errors
    }
  },

  /**
   * Apply drag position (convert percentages to current viewport pixels)
   */
  applyDragPosition() {
    if (!this.root || !this.dragPosition) return;
    const container = this.shadow.querySelector('.mf-container');
    if (!container) return;
    const { x, y } = this.percentToPixel(this.dragPosition.xPct, this.dragPosition.yPct);
    container.style.left = `${x}px`;
    container.style.top = `${y}px`;
    container.style.right = 'auto';
    container.style.bottom = 'auto';
  },

  /**
   * Update drag position from external changes (e.g. storage sync)
   * Accepts both percentage {xPct, yPct} and legacy pixel {x, y} formats
   */
  setDragPosition(position) {
    if (!position) return;
    if (typeof position.xPct === 'number' && typeof position.yPct === 'number') {
      this.dragPosition = { xPct: position.xPct, yPct: position.yPct };
    } else if (typeof position.x === 'number' && typeof position.y === 'number') {
      // Legacy pixel format
      this.dragPosition = this.pixelToPercent(position.x, position.y);
    } else {
      return;
    }
    this.applyDragPosition();
  },

  /**
   * Convert pixel position to percentage of available draggable area.
   * 0% = left/top padding edge, 100% = right/bottom edge minus indicator size.
   * This makes the position zoom-invariant across tabs.
   */
  pixelToPercent(px, py) {
    const size = parseInt(this.root?.style.getPropertyValue('--mf-size')) || 48;
    const padding = this.dragPadding;
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const rangeX = Math.max(1, vw - size - 2 * padding);
    const rangeY = Math.max(1, vh - size - 2 * padding);
    return {
      xPct: Math.min(100, Math.max(0, ((px - padding) / rangeX) * 100)),
      yPct: Math.min(100, Math.max(0, ((py - padding) / rangeY) * 100))
    };
  },

  /**
   * Convert percentage position to current-viewport pixel position.
   * Clamped so the indicator is always fully visible.
   */
  percentToPixel(xPct, yPct) {
    const size = parseInt(this.root?.style.getPropertyValue('--mf-size')) || 48;
    const padding = this.dragPadding;
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const rangeX = Math.max(1, vw - size - 2 * padding);
    const rangeY = Math.max(1, vh - size - 2 * padding);
    const clampedXPct = Math.min(100, Math.max(0, xPct));
    const clampedYPct = Math.min(100, Math.max(0, yPct));
    return {
      x: padding + (clampedXPct / 100) * rangeX,
      y: padding + (clampedYPct / 100) * rangeY
    };
  },

  /**
   * Re-apply position after viewport resize (percentages auto-adapt)
   */
  clampToViewport() {
    if (!this.dragPosition) return;
    this.applyDragPosition();
  },

  /**
   * Position tooltip to stay within viewport
   */
  positionTooltip() {
    if (!this.tooltip || !this.root) return;
    const container = this.shadow.querySelector('.mf-container');
    if (!container) return;

    const padding = 8;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    // Reset to default position (below, left-aligned)
    this.tooltip.style.left = '0';
    this.tooltip.style.right = 'auto';
    this.tooltip.style.top = 'calc(var(--mf-size, 48px) + 8px)';
    this.tooltip.style.bottom = 'auto';

    // Adjust horizontally if off-screen
    let rect = this.tooltip.getBoundingClientRect();
    if (rect.right > viewportWidth - padding) {
      this.tooltip.style.left = 'auto';
      this.tooltip.style.right = '0';
    }
    if (rect.left < padding) {
      this.tooltip.style.left = '0';
      this.tooltip.style.right = 'auto';
    }

    // Adjust vertically if off-screen (flip above)
    rect = this.tooltip.getBoundingClientRect();
    if (rect.bottom > viewportHeight - padding) {
      this.tooltip.style.top = 'auto';
      this.tooltip.style.bottom = 'calc(var(--mf-size, 48px) + 8px)';
    }
  },

  /**
   * Start dragging the indicator
   */
  startDrag(e) {
    const container = this.shadow?.querySelector('.mf-container');
    if (!container) {
      return;
    }
    const rect = container.getBoundingClientRect();
    this.dragPointerId = e.pointerId;
    this.dragStart = { x: e.clientX, y: e.clientY };
    this.dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    this.isDragging = false;
    // Immediately prevent selection
    this.dragRestoreUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    if (container.setPointerCapture) {
      container.setPointerCapture(e.pointerId);
    }
    this.dragMoveHandler = (event) => this.handleDragMove(event);
    this.dragEndHandler = (event) => this.handleDragEnd(event);
    window.addEventListener('pointermove', this.dragMoveHandler);
    window.addEventListener('pointerup', this.dragEndHandler, { once: true });
    window.addEventListener('pointercancel', this.dragEndHandler, { once: true });
    // Don't preventDefault here - let click events work for non-drag clicks
  },

  /**
   * Handle drag move — convert pixel coords to percentages for storage
   */
  handleDragMove(e) {
    if (this.dragPointerId !== e.pointerId) return;
    const container = this.shadow?.querySelector('.mf-container');
    if (!container || !this.dragStart || !this.dragOffset) return;
    const dx = e.clientX - this.dragStart.x;
    const dy = e.clientY - this.dragStart.y;
    if (!this.isDragging && Math.hypot(dx, dy) < 4) return;
    if (!this.isDragging) {
      // First move that exceeds threshold - now it's a drag
      this.isDragging = true;
    }
    e.preventDefault(); // Prevent text selection during drag
    const nextX = e.clientX - this.dragOffset.x;
    const nextY = e.clientY - this.dragOffset.y;
    // Convert to percentages (auto-clamped 0–100)
    this.dragPosition = this.pixelToPercent(nextX, nextY);
    // Apply back to pixels for rendering
    const { x, y } = this.percentToPixel(this.dragPosition.xPct, this.dragPosition.yPct);
    container.style.left = `${x}px`;
    container.style.top = `${y}px`;
    container.style.right = 'auto';
    container.style.bottom = 'auto';
  },

  /**
   * Handle drag end
   */
  handleDragEnd(e) {
    if (this.dragPointerId !== e.pointerId) {
      return;
    }
    const container = this.shadow?.querySelector('.mf-container');
    if (container && container.releasePointerCapture) {
      container.releasePointerCapture(e.pointerId);
    }
    if (this.dragMoveHandler) {
      window.removeEventListener('pointermove', this.dragMoveHandler);
    }
    this.dragMoveHandler = null;
    this.dragEndHandler = null;
    
    if (this.isDragging) {
      this.saveDragPosition();
    } else {
      // This was a click, not a drag - trigger click behavior
      this.handleClick();
    }
    
    this.dragPointerId = null;
    this.dragStart = null;
    this.dragOffset = null;
    this.isDragging = false;
    if (this.dragRestoreUserSelect !== null) {
      document.body.style.userSelect = this.dragRestoreUserSelect;
      this.dragRestoreUserSelect = null;
    }
  },
  
  /**
   * Update the displayed indicator and sentiment
   * @param {Object} analysis - Sentiment analysis result
   */
  update(analysis) {
    if (!this.face) return;
    
    this.currentIndicatorType = resolveIndicatorType(analysis);
    this.currentSentiment = analysis;
    
    // Update indicator SVG
    const indicatorEl = this.face.querySelector('.mf-indicator');
    if (indicatorEl) {
      safeHTML(indicatorEl, getIndicatorSVG(analysis, 32));
      indicatorEl.setAttribute('data-mx-indicator', 'true');
    }
    
    // Update sentiment attribute for styling
    this.face.setAttribute('data-sentiment', analysis.sentiment);
    this.face.classList.remove('loading');
    
    // Toggle manipulative warning class
    if (analysis.isManipulative) {
      this.face.classList.add('manipulative');
    } else {
      this.face.classList.remove('manipulative');
    }
    
    // Update accessibility label
    const sentimentLabel = analysis.isManipulative 
      ? 'Warning: Potentially manipulative content detected'
      : `Page sentiment: ${analysis.sentiment}, ${analysis.description}`;
    this.face.setAttribute('aria-label', sentimentLabel + ' - click for details');
    
    // Store data on root element for E2E testing
    this.root.dataset.sentiment = analysis.sentiment;
    this.root.dataset.intensity = analysis.intensity;
    this.root.dataset.manipulative = analysis.isManipulative;
    this.root.dataset.confidence = analysis.confidence;
    this.root.dataset.wordcount = analysis.wordCount || 0;
    this.root.dataset.indicatorType = this.currentIndicatorType;
    // Store full analysis JSON for detailed E2E extraction
    try { this.root.dataset.analysis = JSON.stringify(analysis); } catch {}
    
    // Update tooltip
    this.updateTooltip(analysis);
    
    // Notify background script to update extension icon
    this.notifyIconUpdate(analysis);
  },
  
  /**
   * Notify background script to update the extension icon
   * @param {Object} analysis
   */
  notifyIconUpdate(analysis) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'updateIcon',
          indicatorType: this.currentIndicatorType,
          sentiment: analysis.sentiment,
          intensity: analysis.intensity,
          isManipulative: analysis.isManipulative
        }).catch(() => {
          // Extension context may be invalidated, ignore
        });
      }
    } catch (e) {
      // Ignore messaging errors
    }
  },
  
  /**
   * Update tooltip content
   * @param {Object} analysis
   */
  updateTooltip(analysis) {
    if (!this.tooltip) return;
    
    const indicatorEl = this.tooltip.querySelector('.mf-tooltip-indicator');
    const textEl = this.tooltip.querySelector('.mf-tooltip-text');
    const detailsEl = this.tooltip.querySelector('.mf-tooltip-details');
    const confidenceBar = this.tooltip.querySelector('.mf-tooltip-confidence-bar');
    
    if (indicatorEl) safeHTML(indicatorEl, getIndicatorSVG(analysis, 48));
    if (textEl) textEl.textContent = analysis.description;
    
    if (detailsEl) {
      const parts = [];
      if (analysis.wordCount) {
        parts.push(`${analysis.wordCount} words analyzed`);
      }
      if (analysis.confidence === 'low') {
        parts.push('Low confidence');
      } else if (analysis.confidence === 'high') {
        parts.push('High confidence');
      }
      if (analysis.isManipulative) {
        parts.push('⚠️ Persuasive language detected');
      }
      detailsEl.textContent = parts.join(' • ');
    }
    
    // Update confidence bar
    if (confidenceBar) {
      const confidencePercent = analysis.confidence === 'high' ? 100 : 
                                analysis.confidence === 'medium' ? 65 : 30;
      confidenceBar.style.width = `${confidencePercent}%`;
    }
  },
  
  /**
   * Show loading state
   */
  showLoading() {
    if (this.face) {
      this.face.classList.add('loading');
    }
  },
  
  /**
   * Show tooltip
   */
  showTooltip() {
    if (this.tooltip) {
      this.positionTooltip();
      this.tooltip.classList.add('visible');
      this.tooltip.setAttribute('aria-hidden', 'false');
    }
    if (this.face) {
      this.face.setAttribute('aria-expanded', 'true');
    }
  },
  
  /**
   * Hide tooltip
   */
  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.classList.remove('visible');
      this.tooltip.setAttribute('aria-hidden', 'true');
    }
    if (this.face) {
      this.face.setAttribute('aria-expanded', 'false');
    }
  },
  
  /**
   * Handle click on the face
   */
  handleClick() {
    // Show tooltip on click (don't toggle to prevent immediate close)
    if (this.tooltip) {
      const isCurrentlyVisible = this.tooltip.classList.contains('visible');
      if (!isCurrentlyVisible) {
          this.suppressNextDocumentClick = true;
        this.showTooltip();
      } else {
        this.hideTooltip();
      }
    }
  },

  /**
   * Disable MX on the current site by adding hostname to disabledSites
   */
  disableOnCurrentSite() {
    this.hideTooltip();
    const hostname = window.location.hostname;
    if (!hostname) return;

    if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
      chrome.storage.sync.get(['disabledSites'], (stored) => {
        const current = stored.disabledSites || '';
        const sites = parseDisabledSites(current);
        if (!sites.includes(hostname.toLowerCase())) {
          sites.push(hostname.toLowerCase());
          chrome.storage.sync.set({ disabledSites: sites.join('\n') });
        }
        // Hide the indicator immediately
        this.hide();
      });
    }
  },

  /**
   * Open the full analysis as an in-page modal overlay
   */
  openFullAnalysis() {
    this.hideTooltip();
    const data = this.currentSentiment;
    if (!data) return;

    // Remove existing modal if any
    const old = this.shadow?.querySelector('.mx-modal-backdrop');
    if (old) old.remove();

    // Use shared utilities for label, confidence, and donut chart
    const label = getSentimentLabel(data.sentiment, data.intensity, data.isManipulative);
    const conf = formatConfidence(data.confidence);

    const indicatorType = this.currentIndicatorType || resolveIndicatorType(data);
    const svgHtml = getIndicatorSVG({ ...data, indicatorType }, 56);

    const intensityPct = `${(data.intensity * 100).toFixed(0)}% intensity`;
    const pageTitle = escapeHtml(document.title || '');
    const pageHost = escapeHtml(location.hostname.replace(/^www\./, '') || '');
    let body = `
      <div class="mx-status">
        <div class="mx-status-indicator">${svgHtml}</div>
        <div class="mx-status-label">${label}</div>
        <div class="mx-status-meta">${conf} · ${intensityPct} · ${data.wordCount || 0} words analyzed</div>
        ${pageTitle || pageHost ? `<div class="mx-status-page">${pageTitle ? `<span class="mx-page-title"><span class="mx-page-title-text">${pageTitle}</span></span>` : ''}${pageHost ? `<span class="mx-page-host">${pageHost}</span>` : ''}</div>` : ''}
      </div>`;

    if (data.isManipulative) {
      body += `<div class="mx-manip-warn">
        <div class="icon">⚠️</div>
        <div>This content shows patterns commonly associated with manipulative media. Read critically and verify claims from multiple sources.</div>
      </div>`;
    } else if (data.sentiment === 'neutral') {
      body += `<div class="mx-neutral-note">Neutral tone doesn\u2019t guarantee accuracy \u2014 MX detects writing style, not truthfulness.</div>`;
    }

    // Build donut chart (or no-signals fallback) via shared utilities
    const groups = collectSignalGroups(data);
    body += buildDonutChart(groups, data, { classPrefix: 'mx-' });

    // Build modal
    const backdrop = document.createElement('div');
    backdrop.classList.add('mx-modal-backdrop');
    safeHTML(backdrop, `
      <div class="mx-modal">
        <div class="mx-modal-header">
          <span>MX Report</span>
          <button class="mx-modal-close" aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="mx-modal-body">${body}</div>
        <div class="mx-modal-footer">
          <button class="mx-open-settings" aria-label="Settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Settings
          </button>
          <button class="mx-open-help" aria-label="Help">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Help
          </button>
        </div>
      </div>`);

    // Close handlers
    const close = () => backdrop.remove();
    backdrop.querySelector('.mx-modal-close').addEventListener('click', close);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });
    const escHandler = (e) => {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);

    // Settings & Help buttons — open extension pages
    // Use abstract message types so the background resolves the correct path
    // (dev has 'src/' prefix, dist builds strip it)
    const openExtPage = (msgType) => {
      try {
        chrome.runtime.sendMessage({ type: msgType }).catch(() => {});
      } catch (e) {
        // Extension context invalidated (e.g. after extension reload)
      }
    };
    const settingsBtn = backdrop.querySelector('.mx-open-settings');
    const helpBtn = backdrop.querySelector('.mx-open-help');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        openExtPage('openSettings');
      });
    }
    if (helpBtn) {
      helpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        openExtPage('openHelp');
      });
    }

    // Interactive drill-down on legend chips and donut segments
    let _mxActiveKey = null;
    backdrop.addEventListener('click', (e) => {
      const chip = e.target.closest('.mx-legend-chip.has-detail');
      const seg = e.target.closest('.mx-donut-seg');
      let targetKey = null;

      if (chip) {
        targetKey = chip.dataset.key;
      } else if (seg) {
        targetKey = seg.dataset.key;
      }

      if (!targetKey) return;

      const modalBody = backdrop.querySelector('.mx-modal-body');
      if (!modalBody) return;

      // Deactivate previous key directly (no querySelectorAll loop)
      const wasActive = _mxActiveKey;
      if (_mxActiveKey) {
        const pk = _mxActiveKey;
        _mxActiveKey = null;
        const pc = modalBody.querySelector(`.mx-legend-chip[data-key="${pk}"]`);
        if (pc) pc.classList.remove('active');
        const ps = modalBody.querySelector(`.mx-donut-seg[data-key="${pk}"]`);
        if (ps) ps.classList.remove('active');
        const pd = modalBody.querySelector(`.mx-chip-detail[data-key="${pk}"]`);
        if (pd) pd.classList.remove('open');
      }

      if (targetKey !== wasActive) {
        // Activate new key
        _mxActiveKey = targetKey;
        const chipEl = modalBody.querySelector(`.mx-legend-chip[data-key="${targetKey}"]`);
        if (chipEl) chipEl.classList.add('active');
        const segEl = modalBody.querySelector(`.mx-donut-seg[data-key="${targetKey}"]`);
        if (segEl) segEl.classList.add('active');
        const detail = modalBody.querySelector(`.mx-chip-detail[data-key="${targetKey}"]`);
        if (detail) detail.classList.add('open');
      }
    });

    this.shadow.appendChild(backdrop);
  },
  
  /**
   * Show error state
   * @param {string} message
   */
  showError(message) {
    if (this.face) {
      this.face.classList.remove('loading');
      const indicatorEl = this.face.querySelector('.mf-indicator');
      if (indicatorEl) safeHTML(indicatorEl, errorSVG(32));
      this.face.setAttribute('data-sentiment', 'neutral');
    }
    
    this.updateTooltip({
      description: message || 'Unable to analyze',
      wordCount: 0,
      confidence: 0,
      isManipulative: false
    });
  },
  
  /**
   * Get the current analysis result
   * Used by popup to display detailed info
   * @returns {Object|null}
   */
  getCurrentAnalysis() {
    if (!this.currentSentiment) return null;
    return {
      ...this.currentSentiment,
      indicatorType: this.currentIndicatorType
    };
  },
  
  /**
   * Hide the MX indicator
   */
  hide() {
    if (this.root) {
      const container = this.shadow.querySelector('.mf-container');
      if (container) {
        container.classList.add('mf-hidden');
      }
      this.root.style.visibility = 'hidden';
    }
  },
  
  /**
   * Show the MX indicator
   */
  show() {
    if (this.root) {
      const container = this.shadow.querySelector('.mf-container');
      if (container) {
        container.classList.remove('mf-hidden');
      }
      this.root.style.visibility = 'visible';
    }
  },
  
  /**
   * Apply settings to the indicator
   * @param {Object} settings - Settings object with position, size, opacity
   */
  applySettings(settings) {
    if (!this.root) return;
    
    const container = this.shadow.querySelector('.mf-container');
    if (!container) return;
    
    // Only apply default position if user hasn't manually dragged the indicator
    if (!this.dragPosition) {
      // Apply position
      const positions = {
        'top-left': { top: '12px', left: '12px', bottom: 'auto', right: 'auto' },
        'top-right': { top: '12px', right: '12px', bottom: 'auto', left: 'auto' },
        'bottom-left': { bottom: '12px', left: '12px', top: 'auto', right: 'auto' },
        'bottom-right': { bottom: '12px', right: '12px', top: 'auto', left: 'auto' }
      };
      
      const pos = positions[settings.position] || positions['bottom-right'];
      Object.assign(container.style, pos);
    }
    
    // Apply size (zoom-compensated)
    if (settings.size) {
      const zoom = this.browserZoom;
      const compensated = Math.round(Math.min(96, Math.max(24, settings.size / zoom)));
      const indicatorSize = Math.round(compensated * 0.67);
      this.root.style.setProperty('--mf-size', `${compensated}px`);
      this.root.style.setProperty('--mf-indicator-size', `${indicatorSize}px`);
    }
    
    // Apply opacity
    if (settings.opacity) {
      const opacity = settings.opacity / 100;
      this.root.style.setProperty('--mf-opacity', opacity);
    }
  },
  
  /**
   * Destroy the MX indicator
   */
  destroy() {
    // Remove global listeners to prevent leaks
    if (this._documentClickHandler) {
      document.removeEventListener('click', this._documentClickHandler);
      this._documentClickHandler = null;
    }
    if (this._scrollHandler) {
      window.removeEventListener('scroll', this._scrollHandler, { capture: true });
      this._scrollHandler = null;
    }
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    }
    
    if (this.root && this.root.parentNode) {
      this.root.parentNode.removeChild(this.root);
    }
    this.root = null;
    this.face = null;
    this.tooltip = null;
    this.isInitialized = false;
  }
};

export { MX };
