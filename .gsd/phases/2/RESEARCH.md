# RESEARCH.md — Phase 2: Cyber-Glass UI

## Design System Analysis

### Current State
- Uses `shadcn/ui` defaults.
- Fonts: System default (Inter/Sans).
- Colors: Standard Slate/Blue palette.
- Vibe: "Clean SaaS" (Generic).

### Target Aesthetic: "Cyber-Glass"
- **Typography**:
  - **Headings**: `Syne` (Google Font) — A distinct, art-house approachable font that feels futuristic but human.
  - **Body**: `DM Sans` (Google Font) — Geometric, modern, highly legible at small sizes.
  - **Mono**: `JetBrains Mono` (Already standard for devs, but good for data).

- **Color Palette (HSL)**:
  - **Background**: Deep Void Blue (`220 40% 10%`) -> Gradient to lighter blue/purple.
  - **Surface**: Glass (White/Black with low opacity + blur).
  - **Primary**: Neon Cyan (`190 100% 50%`) or Electric Purple.
  - **Text**: High contrast for accessibility, but maybe slight blue tint on grey text.

- **Motion**:
  - CSS Keyframes for "fade-in-up" on page load.
  - Hover effects on cards: slight scale + border glow.

## Implementation Strategy
1.  **Fonts**: Add `<link>` to `index.html`.
2.  **Tailwind**: Map `font-display` to `Syne` and `font-body` to `DM Sans`.
3.  **CSS Variables**: Overhaul `index.css` `.dark` root variables to use the new deep palette. The "light" mode might need to be inverted or just kept as a "clean" variant, but "Cyber-Glass" usually implies Dark Mode first. We will focus on Dark Mode excellence.

### Risks
- Legibility of "Syne" at small sizes (won't use it for body).
- Contrast ratios on glass backgrounds (need distinct borders).
