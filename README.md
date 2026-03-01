# Manipulation Index (MX)

A cross-platform browser extension (Chrome, Firefox, Edge) that analyzes sentiment, tone, and manipulation in web content. MX combines word-level sentiment, eight emotional tone signal categories, and manipulation pattern detection into a single at-a-glance gauge indicator — all running locally in the browser with zero external requests.

## Quick Start (Install from Release)

Download the zip for your browser from the [Releases](https://github.com/20240816/MX-Open-Source/releases) page:

| Browser | File | Install |
|---------|------|---------|
| **Chrome** | `mx-chrome-{version}.zip` | Unzip, go to `chrome://extensions`, enable Developer mode, click "Load unpacked", select the unzipped folder |
| **Firefox** | `mx-firefox-{version}.zip` | Go to `about:addons`, click the gear icon, "Install Add-on From File", select the zip |
| **Edge** | `mx-edge-{version}.zip` | Unzip, go to `edge://extensions`, enable Developer mode, click "Load unpacked", select the unzipped folder |

No build step needed — these are ready-to-use extension packages.

---

## Table of Contents

1. [Quick Start (Install from Release)](#quick-start-install-from-release)
2. [Project Intent](#project-intent)
3. [Features](#features)
4. [Architecture](#architecture)
5. [Directory Structure](#directory-structure)
6. [How to Build](#how-to-build)
7. [How to Install (Developer)](#how-to-install-developer)
8. [How to Use](#how-to-use)
9. [Sentiment Classification](#sentiment-classification)

---

## Project Intent

This extension helps users quickly understand the emotional intent behind web content. In an era of clickbait headlines, manipulation tactics, and divisive content, Manipulation Index (MX) provides an at-a-glance gauge indicator of whether the content you're reading is:

- **Positive**: Uplifting, encouraging, warm
- **Negative**: Critical, hostile, or distressing
- **Neutral**: Factual, balanced reporting
- **Manipulative**: Uses fear, division, or urgency tactics

### Goals

- **Visual at-a-Glance Indicator**: A clear gauge that reflects content tone
- **Local Processing Only**: All analysis happens in the browser — no external APIs
- **Visible Text Only**: Only analyzes text visible on the page (not hidden elements)
- **Manipulation Detection**: Identifies fear-mongering, divisive, and urgency tactics
- **Cross-Browser**: Works on Chrome, Firefox, and Edge

---

## Features

- **Gauge Indicator**: SVG gauge meter showing sentiment level, draggable to any position on the page
- **Dual-Ring Donut Chart**: Popup visualization — outer ring for positive signals, inner ring for negative + manipulation signals, proportional fill
- **Tone Signals**: Eight emotional tone categories — Hostility, Alarm, Distress, Contempt (negative) and Admiration, Warmth, Optimism, Celebration (positive)
- **Tone-Adjusted Sentiment**: Tone signals override word-level sentiment when they strongly disagree
- **Manipulation Detection**: Fear framing, urgency pressure, divisive rhetoric, emotional push — with adjustable sensitivity (low/medium/high)
- **Matched Word Transparency**: Click any donut segment or legend chip to see exact matched words
- **Intensity Damping**: Short content gets proportionally dampened scores to avoid exaggerated classifications
- **Visible-Text Analysis**: Analyzes text visible on the page with smart extraction and prominence weighting
- **Settings Page**: Customize size, opacity, position, sensitivity, and per-site disabling
- **Help Page**: In-extension guide with tone signal docs, tips, FAQ
- **No External Dependencies**: Pure JavaScript, no runtime libraries, zero network requests

---

## Architecture

| Component | File | Purpose |
|-----------|------|---------|
| **Service Worker** | `background.js` | Extension icon click handling, dynamic badge icon |
| **Dynamic Icon** | `dynamicIcon.js` | Generates colored extension toolbar icons based on sentiment |
| **Content Script** | `content.js` | Main entry point, initializes and coordinates page analysis |
| **MX UI** | `mx.js` | Floating gauge indicator: drag, tooltip, donut chart, position sync (Shadow DOM) |
| **SVG Indicators** | `svgIndicators.js` | SVG gauge meter graphics for each sentiment level |
| **Text Extractor** | `visibleTextExtractor.js` | DOM text extraction with prominence weights, smart nav/header handling |
| **Sentiment Analyzer** | `sentimentAnalyzer.js` | Sentiment scoring, tone signals (8 categories), manipulation detection |
| **Shared Utilities** | `shared.js` | Common functions: escapeHtml, parseDisabledSites, donut chart builder, etc. |
| **Popup** | `popup.js` / `popup.css` | Extension popup with dual-ring donut chart, tone signals, matched words |
| **Settings** | `options.js` / `options.html` | Settings page (size, opacity, position, sensitivity, disabled sites) |
| **Help** | `help.html` / `help.js` | In-extension user guide with tone docs, tips, FAQ |
| **Dev Logging** | `devLog.js` | Debug logging utility, stripped from production builds |

### Data Flow

Content script loads → text extractor scans visible DOM → sentiment analyzer scores words and detects tone/manipulation → MX UI renders gauge indicator in Shadow DOM → user clicks gauge for detailed breakdown.

Service worker handles toolbar icon clicks and generates dynamic colored icons reflecting the current page sentiment.

---

## Directory Structure

```
mx/
├── manifest.json              # Extension manifest (Manifest V3)
├── package.json               # Project metadata and scripts
├── README.md                  # This file
├── GUIDE.md                   # User-friendly guide
├── BUILD.md                   # Quick build instructions
├── LICENSE                    # MIT License
│
├── src/
│   ├── analyzer/
│   │   ├── sentimentAnalyzer.js   # Sentiment, tone, and manipulation scoring
│   │   └── visibleTextExtractor.js # DOM text extraction with prominence weights
│   │
│   ├── background/
│   │   ├── background.js          # Service worker
│   │   └── dynamicIcon.js         # Dynamic toolbar icon generation
│   │
│   ├── content/
│   │   └── content.js             # Main content script entry point
│   │
│   ├── shared/
│   │   └── shared.js              # Common utilities
│   │
│   ├── ui/
│   │   ├── mx.js                  # Floating gauge indicator (Shadow DOM)
│   │   └── svgIndicators.js       # SVG gauge graphics
│   │
│   ├── popup/
│   │   ├── popup.html             # Extension popup
│   │   ├── popup.js               # Popup logic and donut chart
│   │   └── popup.css              # Popup styles
│   │
│   ├── options/
│   │   ├── options.html           # Settings page
│   │   └── options.js             # Settings persistence
│   │
│   ├── help/
│   │   ├── help.html              # In-extension user guide
│   │   └── help.js                # Help page interactivity
│   │
│   └── utils/
│       └── devLog.js              # Dev-only logging (stripped in production)
│
├── icons/
│   ├── icon-16.svg
│   ├── icon-48.svg
│   ├── icon-128.svg
│   ├── icon-32.png
│   ├── icon-64.png
│   └── icon-128.png
│
└── scripts/
    ├── build.js                   # Cross-browser build script
    └── bundle.js                  # Content script bundler
```

---

## How to Build

### Prerequisites

- Node.js 18+
- npm

### Build Commands

```bash
# Install dependencies
npm install

# Bundle the content script (production mode strips dev logging)
node scripts/bundle.js --prod

# Build for a specific browser
node scripts/build.js chrome
node scripts/build.js firefox
node scripts/build.js edge
```

### Build Output

Built extensions are placed in `dist/{browser}/`:
- `dist/chrome/` — Chrome extension
- `dist/firefox/` — Firefox extension
- `dist/edge/` — Edge extension

---

## How to Install (Developer)

These instructions are for loading the extension from source during development. For pre-built release packages, see [Quick Start](#quick-start-install-from-release).

### Chrome

1. Navigate to `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `dist/chrome` folder

### Firefox

1. Navigate to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select any file in the `dist/firefox` folder

### Edge

1. Navigate to `edge://extensions`
2. Enable "Developer mode" (left sidebar)
3. Click "Load unpacked"
4. Select the `dist/edge` folder

---

## How to Use

1. Visit any webpage with text content
2. The MX gauge indicator appears in the bottom-right corner (configurable)
3. The gauge color and position reflect the emotional tone of visible content:
   - **Green** — Positive (uplifting, encouraging, warm)
   - **Gray** — Neutral (factual, balanced)
   - **Red** — Negative (critical, hostile, distressing)
   - **Warning** — Manipulative (fear, division, urgency tactics)
4. **Drag** the gauge anywhere on the page — position persists across tabs
5. **Click** the gauge for a tooltip with a detailed donut chart breakdown
6. Click the **extension toolbar icon** for the full popup with tone bars and matched words

### Understanding the Analysis

The popup shows:
- **Dual-Ring Donut Chart**: Outer ring = positive tone signals, inner ring = negative tone + manipulation signals
- **Legend Chips**: Click any chip or donut segment to see exactly which words were matched
- **Confidence Level**: Low/Medium/High based on text length and signal count
- **Warning**: Appears if manipulative language exceeds threshold (adjustable via sensitivity setting)

---

## Sentiment Classification

### Positive Indicators

**Strong** (weight 3): love, amazing, wonderful, fantastic, incredible, beautiful, brilliant, excellent, outstanding, magnificent, perfect

**Moderate** (weight 2): good, great, nice, happy, pleased, glad, delighted, positive, beneficial, helpful, supportive, kind

**Mild** (weight 1): okay, fine, acceptable, reasonable, fair, decent, satisfactory, pleasant

### Negative Indicators

**Strong** (weight 3): hate, despise, terrible, horrible, disgusting, evil, corrupt, destroy, devastate, catastrophic, disastrous

**Moderate** (weight 2): bad, wrong, angry, upset, frustrated, disappointed, worried, afraid, harmful, damaging, failure

**Mild** (weight 1): poor, weak, unfortunate, unpleasant, boring, mediocre, disappointing

### Tone Signals

**Negative Tone** (4 categories):
- **Hostility**: violence, war, assault, aggression, terror, brutality
- **Alarm**: crisis, threat, danger, collapse, devastating, catastrophe
- **Distress**: death, suffering, grief, trauma, loss, heartbreak
- **Contempt**: disgust, corruption, scandal, failure, betrayal

**Positive Tone** (4 categories):
- **Admiration**: praise, excellence, triumph, inspiration, mastery
- **Warmth**: love, kindness, compassion, gratitude, belonging
- **Optimism**: hope, progress, improvement, recovery, transform
- **Celebration**: joy, happiness, delight, humor, festival

### Tone-Adjusted Sentiment

When tone signals strongly disagree with word-level sentiment (balance > 0.4, 8+ signals), the tone overrides. This corrects cases where word-level sentiment reads positive but tone signals clearly indicate negative content (e.g., war reporting with words like "strong", "support").

### Manipulation Detection

**Fear-Mongering**: threat, danger, terrifying, crisis, devastating, warning, afraid

**Divisive Language**: enemy, traitor, invader, "us vs them", extremist

**Urgency Tactics**: "act now", urgent, immediately, "before it's too late", "time is running out"

**Emotional Push**: outrage, indignation, emotional override language

### Neutral Indicators

Factual language: "according to", "study shows", "research indicates", "data shows", percent, statistics, survey

---

## License

MIT License — See LICENSE file for details.
