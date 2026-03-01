/**
 * SVG Indicator Module
 * Provides scalable, crisp SVG indicators for manipulation detection
 * 
 * Indicator Types (gauge-meter design):
 * - neutral: Needle pointing straight up (center of yellow zone)
 * - positive-mild: Needle in green zone
 * - positive-strong: Needle deep in green zone
 * - negative-mild: Needle in red zone
 * - negative-strong: Needle deep in red zone
 * - manipulative: Needle deep in red + warning badge
 * 
 * Note: Uses inline styles with !important for Dark Reader protection
 */

/**
 * Generate gauge base SVG with given needle position
 * @param {number} size - Size in pixels
 * @param {number} nx - Needle tip X coordinate (in 128-unit viewBox)
 * @param {number} ny - Needle tip Y coordinate (in 128-unit viewBox)
 * @param {string} extra - Additional SVG content (e.g., warning badge)
 * @returns {string} SVG markup
 */
function gaugeSVG(size, nx, ny, extra = '') {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128" style="color-scheme: light !important;">
      <circle cx="64" cy="64" r="64" style="fill: #1e2d42 !important;"/>
      <g class="mf-gauge-content">
        <path d="M 17 91 A 54 54 0 0 1 29 23" style="fill: none !important; stroke: #10B981 !important; stroke-width: 12; stroke-linecap: round;"/>
        <path d="M 29 23 A 54 54 0 0 1 99 23" style="fill: none !important; stroke: #FBBF24 !important; stroke-width: 12; stroke-linecap: round;"/>
        <path d="M 99 23 A 54 54 0 0 1 111 91" style="fill: none !important; stroke: #EF4444 !important; stroke-width: 12; stroke-linecap: round;"/>
        <line x1="64" y1="64" x2="${nx}" y2="${ny}" style="stroke: #E2E8F0 !important; stroke-width: 4.5; stroke-linecap: round;"/>
        <circle cx="64" cy="64" r="7" style="fill: #E2E8F0 !important;"/>
        ${extra}
      </g>
    </svg>
  `.trim();
}

/** Neutral state — needle pointing straight up (center of yellow zone) */
function neutralSVG(size = 48) {
  return gaugeSVG(size, 64, 27);
}

/** Error/unknown state — gauge with question mark */
function errorSVG(size = 48) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128" style="color-scheme: light !important;">
      <circle cx="64" cy="64" r="64" style="fill: #1e2d42 !important;"/>
      <g class="mf-gauge-content">
        <path d="M 17 91 A 54 54 0 0 1 29 23" style="fill: none !important; stroke: #10B981 !important; stroke-width: 12; stroke-linecap: round; opacity: 0.4;"/>
        <path d="M 29 23 A 54 54 0 0 1 99 23" style="fill: none !important; stroke: #FBBF24 !important; stroke-width: 12; stroke-linecap: round; opacity: 0.4;"/>
        <path d="M 99 23 A 54 54 0 0 1 111 91" style="fill: none !important; stroke: #EF4444 !important; stroke-width: 12; stroke-linecap: round; opacity: 0.4;"/>
        <text x="64" y="76" text-anchor="middle" style="fill: #E2E8F0 !important; font-size: 36px; font-family: system-ui, sans-serif;">?</text>
      </g>
    </svg>
  `.trim();
}

/**
 * Get the appropriate SVG based on analysis result (continuous needle angle)
 * @param {Object} analysis - The sentiment analysis result
 * @param {number} size - Size in pixels
 * @returns {string} SVG markup
 */
function getIndicatorSVG(analysis, size = 48) {
  if (!analysis) {
    return errorSVG(size);
  }
  
  // Use needlePosition from shared.js (available in bundle scope)
  // On-page indicator uses center (64,64) — concentric with circular background
  const { x, y, isManipulative } = needlePosition(analysis, 64);
  const badge = isManipulative
    ? `<circle cx="104" cy="24" r="16" style="fill: #EF4444 !important;"/>
      <text x="104" y="31" text-anchor="middle" style="fill: white !important; font-size: 22px; font-weight: 700; font-family: system-ui, sans-serif;">!</text>`
    : '';
  return gaugeSVG(size, x, y, badge);
}

export {
  neutralSVG,
  errorSVG,
  getIndicatorSVG
};
