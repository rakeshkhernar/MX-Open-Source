/**
 * MX Shared Utilities
 * Common functions used across popup, content script, and UI modules.
 * No imports/exports — loaded as plain script or included in bundles.
 */

/** Default extension settings */
const DEFAULT_SETTINGS = {
  showIndicator: true,
  showOnPageIndicator: true,
  indicatorPosition: 'bottom-right',
  indicatorSize: 48,
  indicatorOpacity: 80,
  manipulationAlerts: true,
  sensitivity: 'medium',
  disabledSites: ''
};

/**
 * Compute needle tip position from analysis data.
 * Maps sentiment + intensity to a continuous angle on the 240° gauge arc.
 * 
 * Gauge arc:  150° (green/positive) → 270° (neutral/top) → 390°/30° (red/negative)
 * Default:    center (64, 77), needle radius 37  (popup / toolbar icon)
 * On-page:    center (64, 68), needle radius 35  (circular floating indicator)
 * 
 * @param {Object} analysis - { sentiment, intensity, isManipulative }
 * @param {number} [centerY=77] - Y coordinate of gauge center
 * @param {number} [radius=37]  - Needle length (tip distance from center)
 * @returns {{ x: number, y: number, isManipulative: boolean }}
 */
function needlePosition(analysis, centerY = 77, radius = 37) {
  // t ∈ [0, 1]: 0 = full positive (green), 0.5 = neutral (yellow), 1 = full negative (red)
  let t = 0.5;
  if (analysis) {
    const intensity = Math.min(1, Math.max(0, analysis.intensity || 0));
    if (analysis.isManipulative) {
      t = 0.5 + (intensity * 0.5);
    } else if (analysis.sentiment === 'positive') {
      t = 0.5 - (intensity * 0.5);
    } else if (analysis.sentiment === 'negative') {
      t = 0.5 + (intensity * 0.5);
    }
  }
  const angleDeg = 150 + t * 240;
  const angleRad = angleDeg * Math.PI / 180;
  return {
    x: Math.round(64 + radius * Math.cos(angleRad)),
    y: Math.round(centerY + radius * Math.sin(angleRad)),
    isManipulative: !!(analysis && analysis.isManipulative)
  };
}

/**
 * Build a gauge SVG with needle positioned by analysis data (for popup/tooltip).
 * Uses inline !important styles for Dark Reader resistance.
 * @param {Object} analysis - { sentiment, intensity, isManipulative }
 * @returns {string} SVG markup
 */
function buildGaugeSVG(analysis) {
  const { x, y, isManipulative } = needlePosition(analysis);
  const badge = isManipulative
    ? `<circle cx="104" cy="24" r="16" style="fill: #EF4444 !important;"/>
    <text x="104" y="31" text-anchor="middle" style="fill: white !important; font-size: 22px; font-weight: 700; font-family: system-ui, sans-serif;">!</text>`
    : '';
  return `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" style="color-scheme: light !important;">
    <rect width="128" height="128" rx="22" style="fill: #172033 !important;"/>
    <path d="M 18 103 A 53 53 0 0 1 30 36" style="fill: none !important; stroke: #10B981 !important; stroke-width: 12; stroke-linecap: round;"/>
    <path d="M 30 36 A 53 53 0 0 1 98 36" style="fill: none !important; stroke: #FBBF24 !important; stroke-width: 12; stroke-linecap: round;"/>
    <path d="M 98 36 A 53 53 0 0 1 110 103" style="fill: none !important; stroke: #EF4444 !important; stroke-width: 12; stroke-linecap: round;"/>
    <line x1="64" y1="77" x2="${x}" y2="${y}" style="stroke: #E2E8F0 !important; stroke-width: 4.5; stroke-linecap: round;"/>
    <circle cx="64" cy="77" r="7" style="fill: #E2E8F0 !important;"/>
    ${badge}
  </svg>`;
}

/** Pre-computed neutral gauge SVG for "no data" states (popup, tooltip) */
const NEUTRAL_SVG = buildGaugeSVG({ sentiment: 'neutral', intensity: 0 });

/** Escape HTML entities to prevent injection via page titles etc. */
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Parse disabled sites string into an array of hostnames */
function parseDisabledSites(value) {
  if (!value) return [];
  return value
    .split(/[\n,]/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Resolve indicator type string from analysis data.
 * Handles pre-computed indicatorType, manipulation, sentiment+intensity.
 * @param {Object|null} data - Analysis result
 * @returns {string} One of: neutral, positive-mild, positive-strong,
 *   negative-mild, negative-strong, manipulative
 */
function resolveIndicatorType(data) {
  if (!data) return 'neutral';
  if (data.indicatorType) return data.indicatorType;
  if (data.isManipulative) return 'manipulative';
  if (data.sentiment === 'positive') {
    return data.intensity > 0.4 ? 'positive-strong' : 'positive-mild';
  }
  if (data.sentiment === 'negative') {
    return data.intensity > 0.4 ? 'negative-strong' : 'negative-mild';
  }
  return 'neutral';
}

/** Get human-readable sentiment label */
function getSentimentLabel(sentiment, intensity, isManipulative) {
  if (isManipulative) return 'Potentially Manipulative';
  if (sentiment === 'neutral') return 'Neutral Tone';
  if (sentiment === 'positive') {
    return intensity > 0.4 ? 'Very Positive' : 'Positive';
  }
  return intensity > 0.4 ? 'Very Negative' : 'Negative';
}

/** Format confidence level for display */
function formatConfidence(confidence) {
  if (confidence === 'high') return 'High confidence';
  if (confidence === 'medium') return 'Medium confidence';
  return 'Low confidence';
}

/** Category color map for tone signals and manipulation patterns */
const SIGNAL_COLORS = {
  fear: '#F43F5E', divisive: '#D946EF', urgency: '#F59E0B', emotional: '#3B82F6',
  hostility: '#DC2626', alarm: '#EA580C', distress: '#06B6D4', contempt: '#7C3AED',
  admiration: '#FBBF24', warmth: '#EC4899', optimism: '#10B981', celebration: '#84CC16'
};

/**
 * Collect signal categories from analysis data into display groups.
 * @param {Object} data - Analysis result with toneSignals and manipulation
 * @returns {Array<{title: string, items: Array}>} Signal groups
 */
function collectSignalGroups(data) {
  const groups = [];
  if (data.toneSignals && typeof data.toneSignals === 'object') {
    const pos = data.toneSignals.positive || {};
    const posItems = [
      { key: 'admiration', label: 'Admiration' },
      { key: 'warmth', label: 'Warmth' },
      { key: 'optimism', label: 'Optimism' },
      { key: 'celebration', label: 'Celebration' }
    ].map(c => ({ ...c, count: Math.round((pos[c.key]?.count ?? pos[c.key]) || 0), matches: pos[c.key]?.matches || [] }))
     .filter(i => i.count > 0);
    if (posItems.length) groups.push({ title: 'Positive Tone', items: posItems });

    const neg = data.toneSignals.negative || {};
    const negItems = [
      { key: 'hostility', label: 'Hostility' },
      { key: 'alarm', label: 'Alarm' },
      { key: 'distress', label: 'Distress' },
      { key: 'contempt', label: 'Contempt' }
    ].map(c => ({ ...c, count: Math.round((neg[c.key]?.count ?? neg[c.key]) || 0), matches: neg[c.key]?.matches || [] }))
     .filter(i => i.count > 0);
    if (negItems.length) groups.push({ title: 'Negative Tone', items: negItems });
  }
  if (data.manipulation && typeof data.manipulation === 'object') {
    const manipItems = [
      { key: 'fear', label: 'Fear-based' },
      { key: 'divisive', label: 'Divisive' },
      { key: 'urgency', label: 'Urgency' },
      { key: 'emotional', label: 'Emotional' }
    ].map(c => ({
      ...c,
      count: Math.round(data.manipulation[c.key] || 0),
      matches: data.manipulation[c.key + 'Matches'] || []
    })).filter(i => i.count > 0);
    if (manipItems.length) groups.push({ title: 'Manipulation', items: manipItems });
  }
  return groups;
}

/**
 * Build dual-ring donut chart HTML from signal groups.
 * Returns the chart HTML including legend chips and drill-down panels,
 * or a "no signals" placeholder when groups is empty but content exists.
 * Category names are overlaid on arcs when segments are wide enough.
 *
 * @param {Array} groups - Signal groups from collectSignalGroups()
 * @param {Object} data - Analysis result (for wordCount/sentiment fallback)
 * @param {Object} [options]
 * @param {string} [options.classPrefix=''] - CSS class prefix (e.g. 'mx-')
 * @returns {string} HTML string
 */
function buildDonutChart(groups, data, options) {
  const p = (options && options.classPrefix) || '';

  if (groups.length === 0) {
    if (data && data.wordCount > 0 && data.sentiment !== 'neutral') {
      return `<div class="${p}analysis-chart ${p}no-signals">
        <div class="${p}no-signals-msg">
          <span class="${p}no-signals-icon">📊</span>
          <span>No specific tone or manipulation signals detected.<br>Overall sentiment is based on word-level analysis.</span>
        </div>
      </div>`;
    }
    return '';
  }

  // Split into outer (positive) and inner (negative + manipulation) rings
  const outerItems = [];
  const innerItems = [];
  for (const g of groups) {
    if (g.title === 'Positive Tone') outerItems.push(...g.items);
    else innerItems.push(...g.items);
  }
  const allItems = [...outerItems, ...innerItems];
  const outerTotal = outerItems.reduce((s, i) => s + i.count, 0);
  const innerTotal = innerItems.reduce((s, i) => s + i.count, 0);
  const total = outerTotal + innerTotal;

  const R_OUTER = 82, R_INNER = 56, SW = 18, GAP = 2;
  const CIRC_OUTER = 2 * Math.PI * R_OUTER;
  const CIRC_INNER = 2 * Math.PI * R_INNER;
  const QUARTER_OUTER = CIRC_OUTER / 4;   // 90° offset to start at top
  const QUARTER_INNER = CIRC_INNER / 4;

  /** Compute SVG arc path for textPath labels (clockwise from startAngle to endAngle) */
  function describeArc(cx, cy, r, startFrac, endFrac) {
    // Fractions of circumference → angles in radians (0 = 3 o'clock)
    // We offset by -PI/2 so 0 fraction = 12 o'clock (top)
    const startRad = startFrac * 2 * Math.PI - Math.PI / 2;
    const endRad = endFrac * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = (endFrac - startFrac) > 0.5 ? 1 : 0;
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }

  /** Estimate whether label text fits inside an arc segment */
  function labelFits(label, segLen) {
    // Approximate: each character needs ~6 SVG units at 8px font
    const charWidth = 5.5;
    const availableLen = segLen * 0.8; // Leave 10% padding each side
    return (label.length * charWidth) <= availableLen;
  }

  let html = `<div class="${p}analysis-chart">`;

  // SVG dual-ring donut (no CSS rotation — offset built into dashoffset)
  html += `<div class="${p}donut-wrapper">`;
  html += `<svg class="${p}donut-svg" viewBox="0 0 200 200">`;
  html += `<defs>`;

  // Track circles (faint ring backgrounds)
  let defsHtml = '';
  let segsHtml = '';
  let labelsHtml = '';

  segsHtml += `<circle class="${p}donut-track" cx="100" cy="100" r="${R_OUTER}" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="${SW}" />`;
  segsHtml += `<circle class="${p}donut-track" cx="100" cy="100" r="${R_INNER}" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="${SW}" />`;

  let segIdx = 0;

  // Outer ring segments (positive tone)
  if (outerItems.length > 0) {
    const outerFilled = (outerTotal / total) * CIRC_OUTER;
    const gapTotal = outerItems.length > 1 ? outerItems.length * GAP : 0;
    const avail = outerFilled - gapTotal;
    let off = 0;
    for (const item of outerItems) {
      const segLen = Math.max(4, (item.count / outerTotal) * avail);
      const color = SIGNAL_COLORS[item.key] || '#6B7280';
      const delay = (segIdx * 0.06).toFixed(2);
      // Shift dashoffset by QUARTER to start segments at top (12 o'clock)
      segsHtml += `<circle class="${p}donut-seg ${p}donut-outer" data-key="${item.key}" cx="100" cy="100" r="${R_OUTER}" fill="none" stroke="${color}" stroke-width="${SW}" stroke-dasharray="${segLen.toFixed(2)} ${(CIRC_OUTER - segLen).toFixed(2)}" stroke-dashoffset="${(QUARTER_OUTER - off).toFixed(2)}" style="animation-delay:${delay}s"><title>${item.label}: ${item.count}</title></circle>`;

      // Arc text label
      if (labelFits(item.label, segLen)) {
        const startFrac = off / CIRC_OUTER;
        const endFrac = (off + segLen) / CIRC_OUTER;
        const arcId = `${p}arc-${item.key}`;
        defsHtml += `<path id="${arcId}" d="${describeArc(100, 100, R_OUTER, startFrac, endFrac)}" fill="none"/>`;
        labelsHtml += `<text class="${p}donut-arc-label"><textPath href="#${arcId}" startOffset="50%" text-anchor="middle">${item.label}</textPath></text>`;
      }

      off += segLen + GAP;
      segIdx++;
    }
  }

  // Inner ring segments (negative tone + manipulation)
  if (innerItems.length > 0) {
    const innerFilled = (innerTotal / total) * CIRC_INNER;
    const gapTotal = innerItems.length > 1 ? innerItems.length * GAP : 0;
    const avail = innerFilled - gapTotal;
    let off = 0;
    for (const item of innerItems) {
      const segLen = Math.max(4, (item.count / innerTotal) * avail);
      const color = SIGNAL_COLORS[item.key] || '#6B7280';
      const delay = (segIdx * 0.06).toFixed(2);
      // Shift dashoffset by QUARTER to start segments at top (12 o'clock)
      segsHtml += `<circle class="${p}donut-seg ${p}donut-inner" data-key="${item.key}" cx="100" cy="100" r="${R_INNER}" fill="none" stroke="${color}" stroke-width="${SW}" stroke-dasharray="${segLen.toFixed(2)} ${(CIRC_INNER - segLen).toFixed(2)}" stroke-dashoffset="${(QUARTER_INNER - off).toFixed(2)}" style="animation-delay:${delay}s"><title>${item.label}: ${item.count}</title></circle>`;

      // Arc text label
      if (labelFits(item.label, segLen)) {
        const startFrac = off / CIRC_INNER;
        const endFrac = (off + segLen) / CIRC_INNER;
        const arcId = `${p}arc-${item.key}`;
        defsHtml += `<path id="${arcId}" d="${describeArc(100, 100, R_INNER, startFrac, endFrac)}" fill="none"/>`;
        labelsHtml += `<text class="${p}donut-arc-label"><textPath href="#${arcId}" startOffset="50%" text-anchor="middle">${item.label}</textPath></text>`;
      }

      off += segLen + GAP;
      segIdx++;
    }
  }

  html += defsHtml;
  html += `</defs>`;
  html += segsHtml;
  html += labelsHtml;
  html += `</svg>`;
  html += `<div class="${p}donut-center"><span class="${p}donut-total">${total}</span><span class="${p}donut-label">signals</span></div>`;
  html += `</div>`; // close donut-wrapper

  // Grouped legend chips (no "inner"/"outer" ring tags)
  html += `<div class="${p}chart-legend">`;
  for (const group of groups) {
    html += `<div class="${p}legend-group">`;
    html += `<div class="${p}legend-group-label">${group.title}</div>`;
    html += `<div class="${p}legend-chips">`;
    for (const item of group.items) {
      const color = SIGNAL_COLORS[item.key] || '#6B7280';
      const hasMatches = item.matches.length > 0;
      html += `<div class="${p}legend-chip${hasMatches ? ' has-detail' : ''}" data-key="${item.key}" style="--chip-color:${color}">`;
      html += `<span class="${p}chip-dot" style="background:${color}"></span>`;
      html += `<span>${item.label}</span>`;
      html += `<span class="${p}chip-count">${item.count}</span>`;
      html += `</div>`;
    }
    html += `</div></div>`; // close legend-chips, legend-group
  }
  html += `</div>`; // close chart-legend
  html += `</div>`; // close analysis-chart

  // Drill-down detail panels (outside chart card so height stays fixed)
  for (const item of allItems) {
    if (item.matches.length > 0) {
      const color = SIGNAL_COLORS[item.key] || '#6B7280';
      html += `<div class="${p}chip-detail" data-key="${item.key}" style="--chip-color:${color}">`;
      html += `<div class="${p}chip-detail-inner">`;
      for (const w of item.matches) html += `<span class="${p}chip-detail-word">${escapeHtml(w)}</span>`;
      html += `</div></div>`;
    }
  }

  return html;
}
