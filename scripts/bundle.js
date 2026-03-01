#!/usr/bin/env node
/**
 * Bundle content script - combines all modules into one file
 * This maintains DRY while making it injectable
 * 
 * Usage:
 *   node scripts/bundle.js          # Development build
 *   node scripts/bundle.js --prod   # Production build (strips dev code)
 */

import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '..', 'src');

// Check for production flag
const isProduction = process.argv.includes('--prod') || process.argv.includes('--production');

/**
 * Strip devLog(...) calls using balanced parenthesis matching.
 * Simple regex can't handle nested parens in template literals like:
 *   devLog('info', 'X', `text (${expr})`);
 * so we walk character-by-character to find balanced pairs.
 */
function stripDevLogCalls(code) {
  const marker = 'devLog';
  let result = '';
  let i = 0;
  
  while (i < code.length) {
    const idx = code.indexOf(marker, i);
    if (idx === -1) {
      result += code.slice(i);
      break;
    }
    
    // Check this is a standalone call, not part of another identifier
    if (idx > 0 && /[a-zA-Z0-9_$]/.test(code[idx - 1])) {
      result += code.slice(i, idx + marker.length);
      i = idx + marker.length;
      continue;
    }
    
    // Find opening paren, skipping whitespace
    let j = idx + marker.length;
    while (j < code.length && /\s/.test(code[j])) j++;
    
    if (j >= code.length || code[j] !== '(') {
      // Not a function call — keep the text
      result += code.slice(i, j);
      i = j;
      continue;
    }
    
    // Walk balanced parens
    let depth = 1;
    j++; // skip opening '('
    while (j < code.length && depth > 0) {
      const ch = code[j];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (ch === '`') {
        // Skip template literal contents (may contain ${...})
        j++;
        while (j < code.length && code[j] !== '`') {
          if (code[j] === '\\') j++; // skip escaped char
          j++;
        }
      } else if (ch === "'" || ch === '"') {
        // Skip string contents
        const quote = ch;
        j++;
        while (j < code.length && code[j] !== quote) {
          if (code[j] === '\\') j++;
          j++;
        }
      }
      j++;
    }
    
    // Skip trailing semicolon and whitespace on same line
    while (j < code.length && (code[j] === ';' || code[j] === ' ')) j++;
    // If it ends with a newline, consume that too for clean output
    if (j < code.length && code[j] === '\n') j++;
    
    // Emit everything before devLog, skip the call
    result += code.slice(i, idx);
    i = j;
  }
  
  return result;
}

// Read all source files
const files = [
  'utils/devLog.js',
  'shared/shared.js',
  'analyzer/visibleTextExtractor.js',
  'analyzer/sentimentAnalyzer.js',
  'ui/svgIndicators.js',
  'ui/mx.js',
  'content/content.js'
];

let bundled = '// Manipulation Index (MX) - Bundled Content Script\n';
bundled += `// Auto-generated - do not edit directly\n`;
bundled += `// Build: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}\n\n`;
bundled += '(function() {\n';
bundled += '  "use strict";\n\n';

// Set PRODUCTION flag for runtime checks
if (isProduction) {
  bundled += '  // Production mode - dev features disabled\n';
  bundled += '  const IS_PRODUCTION = true;\n\n';
} else {
  bundled += '  // Development mode - dev features enabled\n';
  bundled += '  const IS_PRODUCTION = false;\n\n';
}

files.forEach(file => {
  const filepath = path.join(srcDir, file);
  let content = readFileSync(filepath, 'utf8');
  
  // Remove import/export statements (including multi-line imports)
  content = content.replace(/^import\s+[\s\S]*?from\s+['"].*?['"]\s*;?\s*$/gm, '');
  content = content.replace(/^import\s+['"].*?['"]\s*;?\s*$/gm, '');
  content = content.replace(/^export\s+/gm, '');
  content = content.replace(/^export\s*{\s*[\s\S]*?}\s*;?\s*$/gm, '');
  
  // Also catch multi-line imports that span multiple lines
  content = content.replace(/import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]*['"]\s*;?/g, '');
  
  // In production, strip devLog calls (but keep the function for compatibility)
  if (isProduction && file !== 'utils/devLog.js') {
    // Strip devLog(...) calls with balanced parenthesis matching
    // Simple regex can't handle nested parens in template literals,
    // so we walk the string character-by-character
    content = stripDevLogCalls(content);
  }
  
  bundled += `  // ===== ${file} =====\n`;
  bundled += content + '\n\n';
});

bundled += '})();\n';

// Write bundled file
const outPath = path.join(srcDir, 'content', 'content-bundle.js');
writeFileSync(outPath, bundled);

console.log(`✅ Content script bundled successfully (${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'})`);
if (isProduction) {
  console.log('   - Dev logging stripped from content script');
  console.log('   - Production mode enabled');
}
