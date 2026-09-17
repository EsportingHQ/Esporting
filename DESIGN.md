# Design System Document: EsportingHQ

## 1. Overview & Creative North Star: "Glassmorphic Arena"
EsportingHQ is a premier real-time esports platform built with high performance, elegant glassmorphism, and modern SaaS aesthetics. Our Creative North Star is **"Glassmorphic Arena."**

The interface combines frosted translucent surfaces, deep ambient gradient meshes, and glowing fuchsia accents with sub-second live score responsiveness. Layouts provide dense tabular esports telemetry without sacrificing modern whitespace and tactile micro-interactions.

---

## 2. Color Palette & Tokens

The palette is anchored on deep zinc-black canvases accented by radiant fuchsia gradients and crisp white elements.

### Color Tokens
- **Canvas / Void (`bg-void`):** `#09090B` (Deepest charcoal/black backdrop)
- **Glass Surface (`bg-surface`):** `#18181B` / `rgba(24, 24, 27, 0.6)` (Frosted blur cards)
- **Elevated Glass (`bg-elevated`):** `#27272A` / `rgba(39, 39, 42, 0.8)` (Modals, drawers, and popovers)
- **Glass Border (`border-line`):** `rgba(255, 255, 255, 0.08)` (Subtle translucent divider lines)
- **Primary Accent (`accent-primary` / `accent-readout`):** `#D946EF` (Vibrant electric fuchsia)
- **Accent Glow (`accent-glow`):** `#E879F9` (Soft fuchsia highlight)
- **Live / Signal (`accent-live` / `accent-signal`):** `#EF4444` (Live match pulses, high-urgency alerts)
- **Favorite (`accent-favorite`):** `#FBBF24` (Amber gold for starred squads and competitions)
- **Victory State (`state-win`):** `#4ADE80` (Clear emerald green for wins)
- **Loss / Danger (`state-loss`):** `#EF4444` (Defeats and cancellations)
- **Warning (`state-alert`):** `#F59E0B` (Match delays and notices)
- **Primary Text (`text-primary`):** `#FAFAFA` (Crisp high-contrast white)
- **Muted Text (`text-muted`):** `#A1A1AA` (Subtle secondary information)

---

## 3. Glassmorphism Utilities

Standardized glass surface classes across the design system:

```css
/* Standard translucent card with blur */
.glass {
  background: rgba(24, 24, 27, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

/* Elevated glass with higher opacity and border brightness */
.glass-strong {
  background: rgba(24, 24, 27, 0.8);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Hover lift and glow effect */
.glass-hover:hover {
  background: rgba(24, 24, 27, 0.75);
  border-color: rgba(217, 70, 239, 0.25);
  box-shadow: 0 0 30px rgba(217, 70, 239, 0.08), 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

---

## 4. Typography Hierarchy

- **Display (`Geist Sans`, Bold / Black):** Used for headlines, hero typography, scores, and competition titles. Uppercase is reserved for primary headers and labels, while subtext and summaries use sentence-case for readability.
- **Body (`Geist Sans`, Regular / Medium):** Neutral, readable, clean sans-serif for descriptions, article content, and metadata.
- **Data (`Geist Mono`, Medium / Bold):** Monospaced tabular digits for scores, clocks, match timestamps, and numeric counters.

---

## 5. Visual Depth & Motion

1. **Ambient Gradient Mesh (`.gradient-mesh`):** Fluid radial glow orbs slowly drift behind content layers, imparting depth to the dark canvas.
2. **Noise Texture (`.noise-overlay`):** Subtle SVG fractal grain (3% opacity) covers the viewport to eliminate color banding and create tactile texture.
3. **3D Interactive Tilt (`.card-3d`):** Feature cards and previews employ subtle perspective tilting and elevation shadows on hover.
4. **Live Ping Indicators:** Real-time matches utilize expanding radar rings (`animate-ping`) alongside solid live tally dots.
