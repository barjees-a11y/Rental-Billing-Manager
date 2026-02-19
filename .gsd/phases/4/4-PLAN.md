---
phase: 4
plan: 1
wave: 1
---

# Plan 4.1: Cyber-Glass Polish & Performance

## Objective
Extend the "Cyber-Glass" aesthetic to secondary pages (Contracts, Import, Settings) to ensure a consistent experience. Verify performance to meet the "WOW" factor without lag.

## Context
- `src/pages/Contracts.tsx`
- `src/pages/ImportExcel.tsx`
- `src/pages/Settings.tsx` (if exists)

## Tasks

<task type="auto">
  <name>Polish Secondary Pages</name>
  <files>
    src/pages/Contracts.tsx
    src/pages/ImportExcel.tsx
  </files>
  <action>
    1.  **Contracts Page**:
        -   Wrap the main table/list in `.glass-panel`.
        -   Ensure filters and headers use the new typography.
        -   Add entry animations.
    2.  **Import Page**:
        -   Style the file dropzone with a dashed neon border and glass background.
        -   Use gradient text for instructions.
  </action>
  <verify>
    Visual check of consistency.
  </verify>
  <done>
    Secondary pages match the Dashboard aesthetic.
  </done>
</task>

<task type="auto">
  <name>Global Animation Polish</name>
  <files>
    src/index.css
  </files>
  <action>
    -   Tune animation timings (ensure `stagger` feels natural).
    -   Add `will-change` properties to animated elements to promote to compositor layers (performance).
  </action>
  <verify>
    Check for jank during navigation.
  </verify>
  <done>
    Animations are smooth (60fps target).
  </done>
</task>

## Success Criteria
- [ ] All pages (Dashboard, Contracts, Import) share the same "Cyber-Glass" UI.
- [ ] No layout shifts or flashes of unstyled content.
- [ ] Performance score remains high (LCP < 2.5s).
