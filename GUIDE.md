# MX User Guide

**Manipulation Index helps you see through emotionally manipulative content — and understand the emotional tone of everything you read.**

---

## What is MX?

MX is a browser extension that analyzes web pages and shows you a simple indicator of the content's emotional tone. It combines three layers of analysis:

1. **Word-level sentiment** — positive/negative vocabulary
2. **Tone signals** — emotional patterns (hostility, warmth, alarm, optimism, etc.)
3. **Manipulation detection** — fear framing, urgency pressure, divisive rhetoric

Everything runs locally in your browser. No data ever leaves your device.

### The Indicators

| Indicator | Meaning |
|-----------|---------|
| 😊 Green | **Positive** — Uplifting, encouraging, warm content |
| 😐 Gray | **Neutral** — Factual, balanced reporting |
| 🙁 Red | **Negative** — Critical, hostile, or distressing content |
| ⚠️ Warning | **Manipulative** — Uses fear, division, or urgency tactics |

---

## How It Works

1. **Install** — Add MX to your browser (Chrome, Firefox, or Edge)
2. **Browse** — Visit any website as normal
3. **Glance** — Check the face indicator floating in the corner
4. **Click** — Click the face for a detailed breakdown
5. **Explore** — Click any bar to see the exact words that were matched

That's it. MX runs automatically and stays out of your way.

---

## Tone Signals

Tone signals bridge the gap between individual word sentiment and manipulation patterns. They detect emotional overtones in content:

### Negative Tone
| Category | What It Detects |
|----------|----------------|
| **Hostility** | Violence, aggression, war, conflict, confrontation |
| **Alarm** | Crisis, danger, threat, collapse, emergency |
| **Distress** | Death, suffering, grief, loss, trauma |
| **Contempt** | Disgust, corruption, scandal, failure, betrayal |

### Positive Tone
| Category | What It Detects |
|----------|----------------|
| **Admiration** | Praise, excellence, triumph, inspiration, respect |
| **Warmth** | Love, kindness, compassion, gratitude, belonging |
| **Optimism** | Hope, progress, improvement, recovery, growth |
| **Celebration** | Joy, happiness, delight, humor, festivity |

When tone signals strongly disagree with word-level sentiment, the tone overrides. A news article with positive vocabulary ("strong", "support") but heavy hostility/alarm tone signals will correctly show as negative.

---

## Manipulation Patterns

**What MX flags:**
- **Fear framing** — "They don't want you to know...", doomsday scenarios
- **Urgency tactics** — "Act now before it's too late!", countdown pressure
- **Divisive language** — "Us vs. them", "enemies of the people", group vilification
- **Emotional push** — Outrage bait, indignation triggers, emotional override

**What MX does NOT detect:**
- Political bias (left vs. right)
- Factual accuracy (true vs. false)
- Source credibility (trustworthy vs. not)

MX analyzes *how* something is said, not *what* is being said.

---

## Tips & Tricks

### Drag the Indicator
The face icon can be dragged anywhere on the page. Your position is saved and synced across all tabs automatically.

### Read the Donut Chart
The popup and tooltip show a dual-ring donut chart:
- **Outer ring** — Positive tone signals (admiration, warmth, optimism, celebration)
- **Inner ring** — Negative tone + manipulation signals (hostility, alarm, fear, etc.)

Ring fill is proportional to total signal count. Click any legend chip or donut segment to drill down and see the matched words.

### See the Evidence
Click any category in the chart legend to expand it and see the exact words and phrases that were matched. Every score has visible datapoints behind it.

### Disable per Site
Use the popup menu to disable MX on specific sites, or go to Settings → Disabled Sites to manage your exclusion list.

### Compare Sources
Open the same story on two different news sites. MX will show you how each one frames the narrative differently.

### Tone ≠ Truth
A negative tone doesn't mean content is wrong. War coverage is legitimately distressing. MX shows *how* something is said, not whether it's true.

---

## Settings

Right-click the MX extension icon → **Options** to customize. Changes save automatically.

### Display Options
- **Position** — Move indicator to any corner (top-left, top-right, bottom-left, bottom-right)
- **Size** — Adjust from 32px to 72px
- **Opacity** — Make it more or less visible (20% to 100%)

### Analysis Options
- **Manipulation alerts** — Toggle manipulation warning overlays
- **Sensitivity** — Controls how aggressively MX flags manipulation:
  - **Low** — Only flags the most obvious manipulation. Higher threshold, fewer false positives. Best if you browse news/opinion sites frequently and prefer minimal alerts.
  - **Medium** — Balanced detection (default). Good for general browsing.
  - **High** — More cautious detection. Lower threshold, catches borderline cases. Best if you want to be alerted early about potentially manipulative content.

### Site Exclusions
Add sites where MX shouldn't appear:
```
mybank.com
localhost
```

### Dragging Overrides Position
If you drag the indicator to a custom position, that overrides the corner setting. The drag position persists across sessions and syncs across tabs.

---

## Testing Examples

Want to see MX in action? Here are some sites representing different content types:

| Site | Expected | Why |
|------|----------|-----|
| **en.wikipedia.org** | Neutral | Encyclopedic, factual |
| **bbc.com** | Negative | Hard news: war, crisis, conflict |
| **reddit.com** | Neutral/Varies | Mixed content, depends on active posts |
| **breitbart.com** | Negative | Partisan, hostile tone |
| **amazon.com** | Positive-mild | Commercial, encouraging purchase language |

Note: These are real-world examples. Analysis varies based on the specific content visible at the time.

---

## Privacy

MX respects your privacy:
- ✅ **All analysis happens locally** in your browser
- ✅ **No data leaves your device** — ever
- ✅ **No tracking or analytics**
- ✅ **No account required**
- ✅ **Open source** — verify yourself

---

## FAQ

**Q: Why does a professional news site show negative?**
A: Tone signals detect the emotional content of *what's reported*, not the writing quality. Well-written articles about war and crisis correctly show negative tone — because the subject matter is negative.

**Q: Can I see what words triggered each score?**
A: Yes! Every score bar is clickable — click it to see the exact words and patterns that contributed. Full transparency, no black box.

**Q: Why doesn't [obvious propaganda site] show as manipulative?**
A: MX only analyzes visible text. If a front page is mostly images or minimal text, there may not be enough content to trigger manipulation detection.

**Q: Can I disable MX on certain sites?**
A: Yes. Use the popup, or go to Settings → Disabled Sites.

**Q: Does MX slow down my browsing?**
A: No. Analysis happens in milliseconds and doesn't block page loading.

**Q: Is MX always right?**
A: No tool is perfect. MX is a helpful signal, not the final word. Use it alongside your own critical thinking.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Click indicator | Toggle tooltip |
| Enter/Space | Toggle tooltip (when focused) |
| Escape | Close tooltip |
| Tab | Navigate to indicator |

---

## Troubleshooting

**Indicator not appearing?**
1. Check if the site is in your disabled list
2. Try refreshing the page
3. Check if the indicator is enabled in settings

**Analysis seems wrong?**
1. Check the confidence level — low word counts mean low confidence
2. Try scrolling to load more content
3. Click any bar to see the matched words and verify

**Extension not working at all?**
1. Check browser extension permissions
2. Try disabling and re-enabling the extension
3. Reinstall from the extension store

---

*Stay skeptical. Think critically. MX is here to help.*
