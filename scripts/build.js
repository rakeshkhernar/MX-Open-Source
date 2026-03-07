#!/usr/bin/env node

/**
 * Build script for Manipulation Index (MX) extension
 * Creates browser-specific packages in dist/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const BROWSERS = ['chrome', 'firefox', 'edge'];

// Files and directories to include in build
const INCLUDE = [
  'manifest.json',
  'src',
  'icons'
];

// Get target browsers from command line args
const targetBrowsers = process.argv.slice(2).length > 0 
  ? process.argv.slice(2) 
  : BROWSERS;

// Validate browser args
for (const browser of targetBrowsers) {
  if (!BROWSERS.includes(browser)) {
    console.error(`Unknown browser: ${browser}`);
    console.error(`Valid options: ${BROWSERS.join(', ')}`);
    process.exit(1);
  }
}

/**
 * Recursively copy directory
 */
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Adjust manifest for specific browser
 */
function adjustManifest(manifest, browser) {
  const adjusted = { ...manifest };
  
  // Chrome and Edge don't use browser_specific_settings
  if (browser === 'chrome' || browser === 'edge') {
    delete adjusted.browser_specific_settings;
  }
  
  // Firefox doesn't support service_worker, convert to scripts
  if (browser === 'firefox') {
    if (adjusted.background?.service_worker) {
      adjusted.background.scripts = ['background.js'];
      delete adjusted.background.service_worker;
      // Firefox <112 doesn't support type:module for background scripts;
      // our build already bundles into a single non-module file, so remove it
      delete adjusted.background.type;
    }
  } else {
    // Chrome and Edge use service_worker
    if (adjusted.background?.service_worker) {
      adjusted.background.service_worker = 'background.js';
    }
  }
  
  // Adjust background scripts path
  if (adjusted.background?.scripts) {
    adjusted.background.scripts = ['background.js'];
  }
  
  // Adjust content script paths for bundled structure
  if (adjusted.content_scripts) {
    adjusted.content_scripts = adjusted.content_scripts.map(cs => ({
      ...cs,
      js: ['content.js'] // Our bundled content script
    }));
  }
  
  // Adjust web_accessible_resources paths
  if (adjusted.web_accessible_resources) {
    adjusted.web_accessible_resources = adjusted.web_accessible_resources.map(resource => ({
      ...resource,
      resources: resource.resources.map(r => r.replace('src/', ''))
    }));
  }
  
  // Adjust options_ui path for bundled structure
  if (adjusted.options_ui) {
    adjusted.options_ui = {
      ...adjusted.options_ui,
      page: 'options/options.html'
    };
  }
  
  // Adjust popup path for bundled structure
  if (adjusted.action?.default_popup) {
    adjusted.action.default_popup = 'popup/popup.html';
  }

  // Chrome and Edge do not support SVG extension icons — use PNGs only
  if (browser === 'chrome' || browser === 'edge') {
    const svgToPng = (val) => (typeof val === 'string' ? val.replace(/\.svg$/, '.png') : val);
    if (adjusted.icons) {
      adjusted.icons = Object.fromEntries(
        Object.entries(adjusted.icons).map(([k, v]) => [k, svgToPng(v)])
      );
    }
    if (adjusted.action?.default_icon) {
      adjusted.action = {
        ...adjusted.action,
        default_icon: Object.fromEntries(
          Object.entries(adjusted.action.default_icon).map(([k, v]) => [k, svgToPng(v)])
        )
      };
    }
  }

  return adjusted;
}

/**
 * Strip import/export statements from module code
 */
function stripImportsExports(content) {
  // Remove multi-line imports: import { ... } from '...'
  content = content.replace(/import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]*['"]\s*;?/g, '');
  // Remove single-line imports
  content = content.replace(/^import\s+.*?from\s+['"].*?['"]\s*;?\s*$/gm, '');
  content = content.replace(/^import\s+['"].*?['"]\s*;?\s*$/gm, '');
  // Remove export statements
  content = content.replace(/^export\s+(const|function|class|let|var)/gm, '$1');
  content = content.replace(/^export\s+\{[\s\S]*?\}\s*;?\s*$/gm, '');
  content = content.replace(/^export\s+default\s+/gm, '');
  return content;
}

/**
 * Strip blocks between @dev-only-start and @dev-only-end markers
 */
function stripDevOnlyBlocks(content) {
  return content.replace(/\/\/\s*@dev-only-start[\s\S]*?\/\/\s*@dev-only-end\s*\n?/g, '');
}

/**
 * Strip devLog(...) calls using balanced parenthesis matching.
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
    
    // Skip function definitions: "function devLog(...)"
    const before = code.slice(Math.max(0, idx - 20), idx);
    if (/function\s+$/.test(before)) {
      result += code.slice(i, idx + marker.length);
      i = idx + marker.length;
      continue;
    }
    
    // Find opening paren
    let j = idx + marker.length;
    while (j < code.length && /\s/.test(code[j])) j++;
    
    if (j >= code.length || code[j] !== '(') {
      result += code.slice(i, j);
      i = j;
      continue;
    }
    
    // Walk balanced parens
    let depth = 1;
    j++;
    while (j < code.length && depth > 0) {
      const ch = code[j];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (ch === '`') {
        j++;
        while (j < code.length && code[j] !== '`') {
          if (code[j] === '\\') j++;
          j++;
        }
      } else if (ch === "'" || ch === '"') {
        const quote = ch;
        j++;
        while (j < code.length && code[j] !== quote) {
          if (code[j] === '\\') j++;
          j++;
        }
      }
      j++;
    }
    
    while (j < code.length && (code[j] === ';' || code[j] === ' ')) j++;
    if (j < code.length && code[j] === '\n') j++;
    
    result += code.slice(i, idx);
    i = j;
  }
  
  return result;
}

/**
 * Bundle content script into single file
 */
function bundleContentScript(srcDir) {
  const utilFiles = [
    'utils/devLog.js',
    'shared/shared.js'
  ];
  
  const analyzerFiles = [
    'analyzer/visibleTextExtractor.js',
    'analyzer/sentimentAnalyzer.js'
  ];
  
  const uiFiles = [
    'ui/svgIndicators.js',
    'ui/mx.js'
  ];
  
  const contentFile = 'content/content.js';
  
  let bundle = '// Manipulation Index (MX) - Bundled Content Script\n';
  bundle += '(function() {\n';
  bundle += '"use strict";\n\n';
  
  // Add util modules first
  for (const file of utilFiles) {
    const filePath = path.join(srcDir, file);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      content = stripImportsExports(content);
      bundle += `// --- ${file} ---\n`;
      bundle += content + '\n\n';
    }
  }
  
  // Add analyzer and UI modules
  for (const file of [...analyzerFiles, ...uiFiles]) {
    const filePath = path.join(srcDir, file);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      content = stripImportsExports(content);
      bundle += `// --- ${file} ---\n`;
      bundle += content + '\n\n';
    }
  }
  
  // Add main content script
  const mainPath = path.join(srcDir, contentFile);
  if (fs.existsSync(mainPath)) {
    let content = fs.readFileSync(mainPath, 'utf8');
    content = stripImportsExports(content);
    bundle += '// --- content.js ---\n';
    bundle += content + '\n';
  }
  
  bundle += '})();\n';
  
  return bundle;
}

/**
 * Build for a specific browser
 */
function buildForBrowser(browser) {
  console.log(`Building for ${browser}...`);
  
  const distDir = path.join(rootDir, 'dist', browser);
  
  // Clean existing build
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
  }
  fs.mkdirSync(distDir, { recursive: true });
  
  // Copy icons
  const iconsDir = path.join(rootDir, 'icons');
  if (fs.existsSync(iconsDir)) {
    copyDir(iconsDir, path.join(distDir, 'icons'));
  }
  
  // Copy and adjust manifest
  const manifestPath = path.join(rootDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const adjustedManifest = adjustManifest(manifest, browser);
  fs.writeFileSync(
    path.join(distDir, 'manifest.json'),
    JSON.stringify(adjustedManifest, null, 2)
  );
  
  // Bundle and copy background script with dynamicIcon module
  const bgPath = path.join(rootDir, 'src/background/background.js');
  const iconPath = path.join(rootDir, 'src/background/dynamicIcon.js');
  
  if (fs.existsSync(bgPath)) {
    let bgBundle = '// Manipulation Index (MX) - Bundled Background Script\n';
    bgBundle += '(function() {\n';
    bgBundle += '"use strict";\n\n';
    
    // Add devLog utility
    const devLogPath = path.join(rootDir, 'src/utils/devLog.js');
    if (fs.existsSync(devLogPath)) {
      let devLogContent = fs.readFileSync(devLogPath, 'utf8');
      devLogContent = devLogContent.replace(/^export\s+(const|function|class|let|var)/gm, '$1');
      devLogContent = devLogContent.replace(/^export\s+\{[^}]*\};?\s*$/gm, '');
      devLogContent = devLogContent.replace(/^import\s+.*?;\s*$/gm, '');
      bgBundle += '// --- devLog.js ---\n';
      bgBundle += devLogContent + '\n\n';
    }
    
    // Add dynamicIcon module first
    if (fs.existsSync(iconPath)) {
      let iconContent = fs.readFileSync(iconPath, 'utf8');
      iconContent = iconContent.replace(/^export\s+(const|function|class|let|var)/gm, '$1');
      iconContent = iconContent.replace(/^export\s+\{[^}]*\};?\s*$/gm, '');
      iconContent = iconContent.replace(/^export\s+default\s+/gm, '');
      iconContent = iconContent.replace(/^import\s+.*?;\s*$/gm, '');
      bgBundle += '// --- dynamicIcon.js ---\n';
      bgBundle += iconContent + '\n\n';
    }
    
    // Add main background script
    let bgContent = fs.readFileSync(bgPath, 'utf8');
    bgContent = bgContent.replace(/^import\s+.*?;\s*$/gm, '');
    bgContent = bgContent.replace(/['"]src\//g, '"');
    // Strip dev-only blocks (auto-reload, etc.)
    bgContent = stripDevOnlyBlocks(bgContent);
    // Strip devLog calls from background script
    bgContent = stripDevLogCalls(bgContent);
    bgBundle += '// --- background.js ---\n';
    bgBundle += bgContent + '\n';
    
    // Also strip devLog calls from the entire bundle (devLog utility, dynamicIcon, etc.)
    bgBundle = stripDevLogCalls(bgBundle);
    
    bgBundle += '})();\n';
    
    fs.writeFileSync(path.join(distDir, 'background.js'), bgBundle);
  }
  
  // Use the pre-bundled content script (built by bundle.js --prod)
  const bundledPath = path.join(rootDir, 'src/content/content-bundle.js');
  if (fs.existsSync(bundledPath)) {
    fs.copyFileSync(bundledPath, path.join(distDir, 'content.js'));
  } else {
    // Fallback: bundle from source (dev builds without running bundle.js first)
    const srcDir = path.join(rootDir, 'src');
    const bundle = bundleContentScript(srcDir);
    fs.writeFileSync(path.join(distDir, 'content.js'), bundle);
  }
  
  // Copy popup files
  const popupSrcDir = path.join(rootDir, 'src/popup');
  if (fs.existsSync(popupSrcDir)) {
    const popupDistDir = path.join(distDir, 'popup');
    fs.mkdirSync(popupDistDir, { recursive: true });
    
    const popupFiles = fs.readdirSync(popupSrcDir);
    for (const popupFile of popupFiles) {
      fs.copyFileSync(
        path.join(popupSrcDir, popupFile),
        path.join(popupDistDir, popupFile)
      );
    }
  }
  
  // Copy shared utilities (needed by popup.html and options.html via script tag)
  const sharedSrcDir = path.join(rootDir, 'src/shared');
  if (fs.existsSync(sharedSrcDir)) {
    const sharedDistDir = path.join(distDir, 'shared');
    fs.mkdirSync(sharedDistDir, { recursive: true });
    
    const sharedFiles = fs.readdirSync(sharedSrcDir);
    for (const sharedFile of sharedFiles) {
      fs.copyFileSync(
        path.join(sharedSrcDir, sharedFile),
        path.join(sharedDistDir, sharedFile)
      );
    }
  }
  
  // Copy options files
  const optionsSrcDir = path.join(rootDir, 'src/options');
  if (fs.existsSync(optionsSrcDir)) {
    const optionsDistDir = path.join(distDir, 'options');
    fs.mkdirSync(optionsDistDir, { recursive: true });
    
    const optionsFiles = fs.readdirSync(optionsSrcDir);
    for (const optionsFile of optionsFiles) {
      fs.copyFileSync(
        path.join(optionsSrcDir, optionsFile),
        path.join(optionsDistDir, optionsFile)
      );
    }
  }
  
  // Copy help files
  const helpSrcDir = path.join(rootDir, 'src/help');
  if (fs.existsSync(helpSrcDir)) {
    const helpDistDir = path.join(distDir, 'help');
    fs.mkdirSync(helpDistDir, { recursive: true });
    
    const helpFiles = fs.readdirSync(helpSrcDir);
    for (const helpFile of helpFiles) {
      fs.copyFileSync(
        path.join(helpSrcDir, helpFile),
        path.join(helpDistDir, helpFile)
      );
    }
  }
  
  console.log(`  ✓ Built ${browser} extension in dist/${browser}/`);
}

// Main
console.log('Manipulation Index (MX) Build\n');

for (const browser of targetBrowsers) {
  buildForBrowser(browser);
}

console.log('\nBuild complete!');
