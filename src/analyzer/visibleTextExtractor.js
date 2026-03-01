/**
 * Text Extractor Module
 * Extracts all text content from the page with prominence weighting
 * Includes quoted text detection and semantic element prioritization
 */

// Elements to skip when extracting text
// Note: 'nav' and 'header' are NOT here — they use smart heuristic logic
// in shouldSkipElement() to distinguish real navigation from content-heavy
// sections that news sites often wrap in <nav>/<header> elements.
const SKIP_SELECTORS = [
  'script', 'style', 'noscript', 'iframe', 'svg', 'canvas',
  'footer', 'aside',
  '[role="navigation"]', '[aria-hidden="true"]',
  '.ad', '.ads', '.advertisement', '.sidebar', '.menu', '.nav',
  'button', 'input', 'select', 'textarea', 'label',
  '#mx-root', '.mf-container', '.mf-tooltip'
];

const SKIP_SELECTOR_QUERY = SKIP_SELECTORS.join(',');

// Minimum text length to consider a node
const MIN_TEXT_LENGTH = 3;

// Prominence weights by tag name - higher = more important
const PROMINENCE_WEIGHTS = {
  'h1': 5.0,      // Main headline - highest prominence
  'h2': 4.0,      // Section headlines
  'h3': 3.0,      // Subsection headlines
  'h4': 2.5,
  'h5': 2.0,
  'h6': 1.5,
  'title': 5.0,   // Page title
  'strong': 1.5,  // Bold text - slight emphasis
  'b': 1.5,
  'em': 1.3,      // Italic - slight emphasis
  'i': 1.3,
  'blockquote': 0.5, // Quoted content - reduced weight (handled separately)
  'q': 0.5,
  'cite': 0.5,
  'p': 1.0,       // Normal paragraph - baseline
  'span': 1.0,
  'div': 1.0,
  'li': 0.9,      // List items - slightly less prominent
  'td': 0.8,      // Table cells
  'th': 1.2,      // Table headers
  'figcaption': 0.7,
  'small': 0.6,
  'sub': 0.6,
  'sup': 0.6
};

// Quote characters for detecting quoted text
const QUOTE_PATTERNS = [
  /^["'\u2018\u2019\u201C\u201D\u00AB\u00BB\u300C\u300E].*["'\u2018\u2019\u201C\u201D\u00AB\u00BB\u300D\u300F]$/,  // Full quote wrapping
  /^["'\u2018\u2019\u201C\u201D\u00AB\u00BB\u300C\u300E]/,  // Starts with quote
  /["'\u2018\u2019\u201C\u201D\u00AB\u00BB\u300D\u300F]$/   // Ends with quote
];

/**
 * Check if element should be included in analysis
 * Checks CSS visibility (display, visibility, opacity)
 * @param {Element} element
 * @returns {boolean}
 */
function isElementVisible(element) {
  if (!element) return false;
  
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || 
      style.visibility === 'hidden' || 
      style.opacity === '0') {
    return false;
  }
  
  return true;
}

/**
 * Check if element is near the viewport (within buffer distance).
 * On infinite-scroll pages, this ensures we only analyze the content
 * the user can currently see plus a generous buffer zone.
 *
 * @param {Element} element
 * @param {number} bufferMultiplier - How many viewport heights above/below to include
 * @returns {boolean}
 */
function isNearViewport(element, bufferMultiplier = 2) {
  if (!element) return false;
  try {
    const rect = element.getBoundingClientRect();
    // Elements with zero dimensions (e.g. hidden containers) — defer to CSS check
    if (rect.width === 0 && rect.height === 0) return true;
    const vh = window.innerHeight;
    const buffer = vh * bufferMultiplier;
    // Element is "near" if any part is within the buffer zone
    return rect.bottom > -buffer && rect.top < vh + buffer;
  } catch (e) {
    return true; // if getBoundingClientRect fails, include the element
  }
}

/**
 * Check if element should be skipped
 * @param {Element} element
 * @returns {boolean}
 */
function shouldSkipElement(element) {
  if (!element || !element.tagName) return true;
  
  const tagName = element.tagName.toLowerCase();
  
  // Skip specific tags that never contain useful content
  if (['script', 'style', 'noscript', 'iframe', 'svg', 'canvas', 
       'button', 'input', 'select', 'textarea'].includes(tagName)) {
    return true;
  }
  
  // Smart heuristic for nav/header: news homepages often wrap
  // headline grids in <header> or <nav> elements. Only skip if
  // they're short (actual navigation chrome), not content-heavy sections.
  if (tagName === 'nav' || tagName === 'header') {
    // If nested inside article/main/section, it's content metadata — keep it
    if (element.closest('article, main, section, [role="main"]')) {
      return false;
    }
    // If element has substantial text (>500 chars), it's likely content
    const textLen = element.textContent?.trim().length || 0;
    if (textLen > 500) {
      return false;
    }
    // Short nav/header — skip as navigation chrome
    return true;
  }
  
  // Check if matches skip selectors (ads, sidebar, footer, aside, etc.)
  try {
    if (element.matches && element.matches(SKIP_SELECTOR_QUERY)) {
      return true;
    }
  } catch (e) {
    // Invalid selector, ignore
  }
  
  return false;
}

/**
 * Get prominence weight for an element
 * @param {Element} element
 * @returns {number}
 */
function getProminenceWeight(element) {
  if (!element || !element.tagName) return 1.0;
  
  const tagName = element.tagName.toLowerCase();
  let weight = PROMINENCE_WEIGHTS[tagName] || 1.0;
  
  // Check if inside main content areas (boost weight)
  if (element.closest('article, main, [role="main"], .content, .article, .post')) {
    weight *= 1.2;
  }
  
  // Check if inside sidebar/aside (reduce weight)
  if (element.closest('aside, .sidebar, .widget, .related')) {
    weight *= 0.5;
  }
  
  return weight;
}

/**
 * Check if text appears to be quoted
 * @param {string} text
 * @param {Element} element
 * @returns {boolean}
 */
function isQuotedText(text, element) {
  if (!text || !element) return false;
  
  // Check if parent is a quote element
  const tagName = element.tagName?.toLowerCase();
  if (['blockquote', 'q', 'cite'].includes(tagName)) {
    return true;
  }
  
  // Check if inside a quote element
  if (element.closest('blockquote, q, cite')) {
    return true;
  }
  
  // Check for quote marks in text
  const trimmed = text.trim();
  for (const pattern of QUOTE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Extract visible text from the current viewport with prominence data
 * @returns {Object} - Contains visible text, segments with weights, and metadata
 */
function extractVisibleText() {
  const textSegments = [];
  const seenText = new Set();
  let totalQuotedWords = 0;
  let totalWords = 0;

  const visibilityCache = new WeakMap();
  const viewportCache = new WeakMap();
  const skipCache = new WeakMap();

  const isElementVisibleCached = (element) => {
    if (!element) return false;
    const cached = visibilityCache.get(element);
    if (cached !== undefined) return cached;
    const visible = isElementVisible(element);
    visibilityCache.set(element, visible);
    return visible;
  };

  const isNearViewportCached = (element) => {
    if (!element) return false;
    const cached = viewportCache.get(element);
    if (cached !== undefined) return cached;
    const near = isNearViewport(element);
    viewportCache.set(element, near);
    return near;
  };

  const shouldSkipElementOrAncestorCached = (element) => {
    if (!element) return true;
    const cached = skipCache.get(element);
    if (cached !== undefined) return cached;

    let current = element;
    while (current && current !== document.body) {
      const cachedCurrent = skipCache.get(current);
      if (cachedCurrent !== undefined) {
        skipCache.set(element, cachedCurrent);
        return cachedCurrent;
      }
      if (shouldSkipElement(current)) {
        skipCache.set(element, true);
        return true;
      }
      current = current.parentElement;
    }

    skipCache.set(element, false);
    return false;
  };
  
  // Walk the DOM tree
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        // Skip if parent or any ancestor is hidden or should be skipped
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (shouldSkipElementOrAncestorCached(parent)) return NodeFilter.FILTER_REJECT;
        if (!isElementVisibleCached(parent)) return NodeFilter.FILTER_REJECT;
        if (!isNearViewportCached(parent)) return NodeFilter.FILTER_REJECT;
        
        // Skip empty or whitespace-only text
        const text = node.textContent.trim();
        if (text.length < MIN_TEXT_LENGTH) return NodeFilter.FILTER_REJECT;
        
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  // Collect visible text nodes with metadata
  let node;
  while (node = walker.nextNode()) {
    const text = node.textContent.trim();
    const parent = node.parentElement;
    
    // Deduplicate - use length + start + end to avoid collisions
    const hash = text.length + ':' + text.slice(0, 30).toLowerCase() + ':' + text.slice(-20).toLowerCase();
    if (seenText.has(hash)) continue;
    seenText.add(hash);
    
    const tagName = parent?.tagName?.toLowerCase() || 'unknown';
    const weight = getProminenceWeight(parent);
    const isQuoted = isQuotedText(text, parent);
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    
    totalWords += wordCount;
    if (isQuoted) {
      totalQuotedWords += wordCount;
    }
    
    textSegments.push({
      text,
      tagName,
      weight,
      isQuoted,
      wordCount
    });
  }
  
  // Calculate quoted ratio
  const quotedRatio = totalWords > 0 ? totalQuotedWords / totalWords : 0;
  
  // If majority is quoted (>60%), don't give quotes a pass
  const ignoreQuotedStatus = quotedRatio > 0.6;
  
  // Adjust weights: if not ignoring quoted status, reduce weight of quoted text
  if (!ignoreQuotedStatus) {
    textSegments.forEach(seg => {
      if (seg.isQuoted) {
        seg.weight *= 0.2; // Heavily reduce quoted text influence
      }
    });
  }
  
  // Combine into coherent text (for backward compatibility)
  const combinedText = textSegments
    .map(s => s.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return {
    text: combinedText,
    segments: textSegments,
    nodeCount: textSegments.length,
    wordCount: totalWords,
    charCount: combinedText.length,
    quotedRatio,
    ignoreQuotedStatus
  };
}

/**
 * Get a sample of visible text (limited for performance)
 * @param {number} maxWords - Maximum words to extract
 * @returns {Object}
 */
function extractVisibleTextSample(maxWords = 500) {
  const result = extractVisibleText();
  
  // If under limit, return as-is
  if (result.wordCount <= maxWords) {
    result.truncated = false;
    return result;
  }
  
  // Need to truncate - prioritize high-prominence segments
  const sortedSegments = [...result.segments].sort((a, b) => b.weight - a.weight);
  
  const selectedSegments = [];
  let selectedWords = 0;
  
  for (const segment of sortedSegments) {
    if (selectedWords + segment.wordCount <= maxWords) {
      selectedSegments.push(segment);
      selectedWords += segment.wordCount;
    } else if (selectedWords < maxWords) {
      // Partial include of last segment
      const remainingWords = maxWords - selectedWords;
      const words = segment.text.split(/\s+/);
      const partialText = words.slice(0, remainingWords).join(' ');
      selectedSegments.push({
        ...segment,
        text: partialText,
        wordCount: remainingWords
      });
      selectedWords = maxWords;
      break;
    }
  }
  
  // Reconstruct text in original order (sort by appearance would require tracking)
  const truncatedText = selectedSegments
    .map(s => s.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return {
    text: truncatedText,
    segments: selectedSegments,
    nodeCount: selectedSegments.length,
    wordCount: selectedWords,
    charCount: truncatedText.length,
    quotedRatio: result.quotedRatio,
    ignoreQuotedStatus: result.ignoreQuotedStatus,
    truncated: true
  };
}

export { 
  extractVisibleTextSample, 
  getProminenceWeight,
  isQuotedText,
  PROMINENCE_WEIGHTS
};
