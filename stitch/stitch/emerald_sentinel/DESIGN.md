# Design System Specification: Corporate Management Dashboard

## 1. Overview & Creative North Star

### Creative North Star: "The Architectural Ledger"
This design system is built on the philosophy of **Architectural Ledgering**. It moves away from the chaotic "widget-based" dashboards common in corporate software, favoring an editorial, high-end aesthetic that prioritizes clarity, authority, and spatial intent. We treat the UI not as a collection of boxes, but as a series of curated planes and layers.

The experience is defined by **intentional asymmetry**—using wide gutters and varying column widths to guide the eye—and **tonal depth**, where meaning is conveyed through subtle shifts in surface color rather than aggressive borders or heavy shadows.

## 2. Color & Surface Philosophy

The palette is rooted in deep navy and slate tones to evoke stability and seriousness, punctuated by a high-performance emerald green.

### Palette Highlights
- **Primary / Core Navigation:** `#525f71` (Primary) and `#2a3439` (On-Surface).
- **The Success Signal:** `#006d4b` (Tertiary). Reserved strictly for positive growth, completed actions, and "Active" status indicators.
- **The Neutral Foundation:** A sophisticated range of whites and grays starting from `#f7f9fb` (Background) up to `#d9e4ea` (Surface Variant).

### The "No-Line" Rule
To achieve a bespoke, premium feel, **1px solid borders are prohibited for sectioning.** 
Structural boundaries must be defined through:
1. **Background Shifts:** Placing a `surface-container-low` (`#f0f4f7`) card against a `surface` (`#f7f9fb`) background.
2. **Generous White Space:** Using the spacing scale (e.g., `8` or `10`) to separate logical groups.

### Surface Hierarchy & Nesting
Treat the dashboard as a physical stack of materials. 
- **Base Layer:** `surface` (`#f7f9fb`).
- **Secondary Sections:** `surface-container-low` (`#f0f4f7`).
- **Interactive Cards/Elements:** `surface-container-lowest` (`#ffffff`) to create a "pop" effect.
- **The "Glass" Rule:** For floating modals or navigation overlays, use a semi-transparent `surface` color with a `20px` backdrop-blur to maintain a sense of environmental depth.

## 3. Typography

The system utilizes a dual-type approach to balance editorial personality with data-driven precision.

*   **Display & Headlines (Manrope):** Chosen for its geometric modernism. Used for large data points and page titles to provide an authoritative "Editorial" voice.
*   **Interface & Body (Inter):** The workhorse for readability. Increased letter-spacing (tracking) is required for all `label` and `body-sm` styles to ensure legibility in dense data environments.

| Role | Token | Font | Size | Tracking |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Data** | Display-LG | Manrope | 3.5rem | -0.02em |
| **Section Header** | Headline-SM | Manrope | 1.5rem | 0 |
| **Table Header** | Label-MD | Inter | 0.75rem | 0.05em (Uppercase) |
| **Content Body** | Body-MD | Inter | 0.875rem | 0 |

## 4. Elevation & Depth

We move beyond "standard" material shadows in favor of **Tonal Layering**.

### The Layering Principle
Depth is achieved by stacking surface tokens. A `surface-container-highest` (`#d9e4ea`) element nested within a `surface-container` (`#e8eff3`) provides a tactile feel without the visual "noise" of a shadow.

### Ambient Shadows
When a floating effect is mandatory (e.g., a dropdown or primary action card):
- **Color:** Use a tinted shadow based on `on-surface` (`#2a3439`) at 5% opacity.
- **Blur:** Large and diffused (e.g., `X:0, Y:8, B:24, S:0`). Avoid "tight" shadows that feel like 2010s web design.

### The "Ghost Border"
If a container requires a border for accessibility (e.g., in a high-density table), use the `outline-variant` (`#a9b4b9`) at **15% opacity**. It should be felt, not seen.

## 5. Components

### Buttons
- **Primary:** High-contrast `primary` (`#525f71`) with `on-primary` text. Use `xl` (0.75rem) roundedness for a modern, approachable feel.
- **Positive Action:** `tertiary` (`#006d4b`). Use only for final "Submit" or "New" actions.
- **Secondary:** Transparent background with a `ghost-border` and `primary` text.

### High-End Editorial Cards
Forbid divider lines within cards. Instead:
- Use **Vertical Spacing** (Token `4` or `5`) to separate headers from content.
- Use **Subtle Background Gradients** (from `surface-container-lowest` to `surface-container-low`) to provide a "soul" to the card that flat white cannot achieve.

### Tables & Lists
- **No Borders:** Forbid horizontal lines between rows. Use a alternating background shift (`surface-container-lowest` vs `surface-container-low`) or simply generous vertical padding (`3`).
- **Alignment:** Data must be optically aligned. Labels use `label-sm` in all-caps with `0.08em` tracking for a sophisticated, ledger-like appearance.

### Status Chips
- **Success:** `tertiary-container` (`#7ff3be`) background with `on-tertiary-container` (`#005a3d`) text.
- **Neutral:** `surface-variant` background with `on-surface-variant` text.

## 6. Do's and Don'ts

### Do
*   **DO** use intentional asymmetry. A dashboard column at 60% width next to one at 40% creates a more premium, "designed" look than two 50% columns.
*   **DO** use thin-line icons (1px or 1.5px stroke) to match the sophistication of the typography.
*   **DO** maximize letter spacing on small labels to ensure the "Serious Corporate" tone remains legible.

### Don't
*   **DON'T** use 100% black (`#000000`). Our deepest tone is `inverse_surface` (`#0b0f10`).
*   **DON'T** use standard 1px borders to separate navigation from content. Use a `surface-dim` background for the sidebar to create a natural "seam."
*   **DON'T** use high-vibrancy colors for anything other than specific status alerts. The "Emerald Green" should be the only vivid color on the screen.