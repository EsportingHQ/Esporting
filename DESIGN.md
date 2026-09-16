# Design System Document: Esporting Broadcast Interface

## 1. Overview & Creative North Star: "The Telemetry Deck"
This design system is built to capture the feeling of a live television broadcast control room—high-contrast, data-dense, and highly functional. Our Creative North Star is **"The Telemetry Deck."**

The interface feels like a mission control monitor. There is no decorative fluff. Layouts are strictly structured, tabular, and built for speed-reading. Hover states trigger crisp neon glows, and live updates roll, flash, or pulse in real-time.

---

## 2. Colors & Surface Philosophy
The palette is built around an ultra-dark background with bright neon telemetry accents.

### Color Tokens
- **Void Background (bg-void):** `#08080a` (The canvas of space, deep charcoal black)
- **Surface Layer (bg-surface):** `#111115` (Cards, sidebars, and control boxes)
- **Border Line (border-line):** `#1f1f26` (Thin structural lines)
- **Accent Readout (accent-readout):** `#00ffcc` (Electric Cyan. Main interactive element color, links, highlight statistics)
- **Accent Signal (accent-signal):** `#ff3366` (Electric Magenta. Live pulse indicator, alerts, flash moments)
- **Victory State (state-win):** `#00ff66` (High-visibility green for wins and completions)
- **Loss State (state-loss):** `#ff3333` (Warning red for defeats and disqualifications)
- **Alert State (state-alert):** `#ffaa00` (Amber yellow for delay notifications or correction tags)

---

## 3. Typography: Tactical Readouts
We pair highly readable sans-serifs with tabular monospace figures to ensure clear hierarchy in fast-moving tables.

- **Display (Rajdhani):** Condensed, aggressive, uppercase. Use for title cards, team names in scoreboard blocks, and large numbers.
- **Body (Inter):** Clean, neutral, high-legibility. Use for forms, description text, and dashboard navigation.
- **Data (JetBrains Mono):** Tabular numbers, monospaced letters. Use for scores, timers, match statistics, and raw logs.

---

## 4. Components

### Scoreboard (Head-to-Head)
- A dark block (`bg-surface`) with a neon green tally light (`accent-signal` or `state-win` animation) pulsing when live.
- Score digits use `RollDigit` component with vertical sliding translation.

### Ticker Bar
- A scrolling marquee at the very bottom of the page showing live match tickers. Uses `JetBrains Mono` for rapid-fire data scanning.

### Control Panels (Dashboard)
- Compact grid boxes with thin borders (`border-line`).
- Interactive inputs are flat dark blocks (`bg-void`) with sharp border transitions to `accent-readout` on focus.
