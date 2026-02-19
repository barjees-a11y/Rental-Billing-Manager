---
phase: 2
plan: 1
wave: 1
---

# Plan 2.1: Cyber-Glass Foundation

## Objective
Establish the typography and color system for the new "Cyber-Glass" aesthetic. This involves installing new fonts and redefining the global CSS variables to create a deep, atmospheric dark mode.

## Context
- `index.html` (Font imports)
- `tailwind.config.ts` (Theme config)
- `src/index.css` (CSS Variables)

## Tasks

<task type="auto">
  <name>Install Fonts & Config</name>
  <files>
    index.html
    tailwind.config.ts
  </files>
  <action>
    1. Modify `index.html`:
       - Add Google Fonts preconnect.
       - Add import for `Syne:400,700` and `DM Sans:400,500,700`.
    2. Modify `tailwind.config.ts`:
       - Add `fontFamily` utility:
         - `display`: ["Syne", "sans-serif"]
         - `body`: ["DM Sans", "sans-serif"]
       - Extend animations with `fade-in` and `slide-up`.
  </action>
  <verify>
    Check `tailwind.config.ts` has the new fonts.
    Visual check (later).
  </verify>
  <done>
    Fonts declared in config.
  </done>
</task>

<task type="auto">
  <name>Themify CSS Variables</name>
  <files>
    src/index.css
  </files>
  <action>
    Update CSS variables in `:root` and `.dark`:
    - **Background**: Change from flat colors to deep gradients (via `background-image` or deep HSL).
    - **Cards**: Increase translucency for glass effect.
    - **Primary**: Shift to a vibrant "Electric Blue/Purple".
    - **Radius**: Increase slightly for "bubble" glass feel (optional, maybe keep modern).
    - Add `.glass-panel` utility class for reusable glass styling.
  </action>
  <verify>
    Ensure `src/index.css` parses correctly.
  </verify>
  <done>
    CSS variables updated to new palette.
  </done>
</task>

## Success Criteria
- [ ] Fonts (Syne, DM Sans) are available in the app.
- [ ] Dark mode default background is atmospheric (not solid #000).
- [ ] UI components inherit the new "Cyber" specific colors.
