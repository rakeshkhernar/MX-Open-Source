/**
 * Dynamic Icon Generator for Extension Toolbar Icon
 * 
 * Uses OffscreenCanvas 2D API directly (no SVG, no createImageBitmap) because
 * Chrome MV3 service workers cannot decode SVG images in any form.
 * 
 * Gauge design: green→yellow→red arc, needle indicates sentiment.
 * Canvas coordinate system: center at (size/2, size*0.6), radius size*0.41
 */

/**
 * Compute needle angle from analysis data (0..1 maps to green..red)
 * @param {Object} data - { sentiment, intensity, isManipulative }
 * @returns {{ t: number, isManipulative: boolean }}
 */
function getNeedleT(data) {
  let t = 0.5;
  if (data) {
    const intensity = Math.min(1, Math.max(0, data.intensity || 0));
    if (data.isManipulative) {
      t = 0.5 + (intensity * 0.5);
    } else if (data.sentiment === 'positive') {
      t = 0.5 - (intensity * 0.5);
    } else if (data.sentiment === 'negative') {
      t = 0.5 + (intensity * 0.5);
    }
  }
  return { t, isManipulative: !!(data && data.isManipulative) };
}

/**
 * Draw a gauge icon on an OffscreenCanvas
 * @param {number} size - Icon size in pixels
 * @param {Object|string} analysisOrType - Analysis data or type string
 * @returns {ImageData} Rendered icon as ImageData
 */
function renderIcon(size, analysisOrType) {
  let isLoading = false, isError = false;
  let data = null;

  if (typeof analysisOrType === 'string') {
    if (analysisOrType === 'loading') isLoading = true;
    else if (analysisOrType === 'error') isError = true;
    else {
      const map = {
        'neutral':         { sentiment: 'neutral', intensity: 0, isManipulative: false },
        'positive-mild':   { sentiment: 'positive', intensity: 0.4, isManipulative: false },
        'positive-strong': { sentiment: 'positive', intensity: 0.9, isManipulative: false },
        'negative-mild':   { sentiment: 'negative', intensity: 0.4, isManipulative: false },
        'negative-strong': { sentiment: 'negative', intensity: 0.9, isManipulative: false },
        'manipulative':    { sentiment: 'negative', intensity: 0.9, isManipulative: true }
      };
      data = map[analysisOrType] || map.neutral;
    }
  } else {
    data = analysisOrType;
  }

  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const cx = size / 2;
  const cy = size * 0.6;
  const r = size * 0.41;
  const arcWidth = size <= 16 ? size * 0.22 : size <= 32 ? size * 0.18 : size * 0.14;
  const isInactive = isLoading || isError;

  // Background rounded rect
  const radius = size * 0.17;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  const bg = ctx.createLinearGradient(0, 0, 0, size);
  bg.addColorStop(0, '#1E293B');
  bg.addColorStop(1, '#0F172A');
  ctx.fillStyle = bg;
  ctx.fill();

  // Gauge arcs: green (150°→210°), yellow (210°→330°), red (330°→30°)
  // In canvas angles: 150° = 5π/6, end = 150+240 = 390° = 30° = π/6
  // Three segments covering the 240° arc:
  // Green:  150° → 230° (80° span)
  // Yellow: 230° → 310° (80° span)
  // Red:    310° → 390° (80° span)
  const toRad = (deg) => deg * Math.PI / 180;

  ctx.globalAlpha = isInactive ? 0.4 : 1.0;
  ctx.lineWidth = arcWidth;
  ctx.lineCap = 'round';

  // Green arc
  ctx.beginPath();
  ctx.arc(cx, cy, r, toRad(150), toRad(230));
  ctx.strokeStyle = '#10B981';
  ctx.stroke();

  // Yellow arc
  ctx.beginPath();
  ctx.arc(cx, cy, r, toRad(230), toRad(310));
  ctx.strokeStyle = '#FBBF24';
  ctx.stroke();

  // Red arc
  ctx.beginPath();
  ctx.arc(cx, cy, r, toRad(310), toRad(390));
  ctx.strokeStyle = '#EF4444';
  ctx.stroke();

  ctx.globalAlpha = 1.0;

  if (!isLoading && !isError && data) {
    const { t, isManipulative } = getNeedleT(data);
    const needleAngle = toRad(150 + t * 240);
    const needleLen = r * 0.72;
    const needleWidth = size <= 16 ? size * 0.13 : size <= 32 ? size * 0.1 : size * 0.07;
    const pivotR = size <= 16 ? size * 0.12 : size <= 32 ? size * 0.1 : size * 0.08;

    // Needle line
    const nx = cx + needleLen * Math.cos(needleAngle);
    const ny = cy + needleLen * Math.sin(needleAngle);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = needleWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Pivot circle
    ctx.beginPath();
    ctx.arc(cx, cy, pivotR, 0, Math.PI * 2);
    ctx.fillStyle = '#E2E8F0';
    ctx.fill();

    // Manipulation badge
    if (isManipulative) {
      const bx = size * 0.8;
      const by = size * 0.2;
      const br = size * 0.13;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fillStyle = '#EF4444';
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = `bold ${Math.round(size * 0.17)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', bx, by + 1);
    }
  } else if (isError) {
    ctx.fillStyle = '#E2E8F0';
    ctx.font = `${Math.round(size * 0.4)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', cx, cy);
  }

  return ctx.getImageData(0, 0, size, size);
}

/**
 * Get all icon ImageData objects for chrome.action.setIcon({ imageData })
 * @param {Object|string} analysisOrType - Analysis data or indicator type string
 * @returns {Object} Object with sizes as keys, ImageData as values
 */
function getAllIconImageData(analysisOrType) {
  const sizes = [16, 32, 48, 128];
  const result = {};
  for (const size of sizes) {
    result[size] = renderIcon(size, analysisOrType);
  }
  return result;
}

export {
  getAllIconImageData
};
