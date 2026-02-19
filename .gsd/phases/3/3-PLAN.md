---
phase: 3
plan: 1
wave: 1
---

# Plan 3.1: Cyber-Glass Implementation

## Objective
Apply the "Cyber-Glass" design system to the core application layout and main dashboard. This transforms the generic shadcn/ui components into the new atmospheric aesthetic.

## Context
- `src/components/layout/AppLayout.tsx` (Main shell)
- `src/pages/Dashboard.tsx` (Home view)
- `src/index.css` (New utility classes)

## Tasks

<task type="auto">
  <name>Glass Layout Upgrade</name>
  <files>
    src/components/layout/AppLayout.tsx
  </files>
  <action>
    1. Update `AppLayout.tsx`:
       - Replace standard white sidebar with `.glass-sidebar` class.
       - Ensure the main content area has the transparent background to reveal the body gradient.
       - Update Sidebar links to use `Syne` font for headers and `DM Sans` for links.
       - Add hover effects (neon glow) to navigation items.
  </action>
  <verify>
    Visual check of sidebar transparency and font usage.
  </verify>
  <done>
    Sidebar and Layout use glass classes and new fonts.
  </done>
</task>

<task type="auto">
  <name>Dashboard Redesign</name>
  <files>
    src/pages/Dashboard.tsx
    src/components/ui/card.tsx (if reusable)
  </files>
  <action>
    1. Update `Dashboard.tsx`:
       - Wrap main stats cards in `.glass-panel` or `.glass-card`.
       - Apply staggered entry animations (`animate-slide-up`) to cards with delay.
       - Use gradient text for the "Welcome Back" header.
       - Ensure charts (Recharts) have transparent backgrounds to blend with glass cards.
  </action>
  <verify>
    Check animation classes are present.
    Check cards use glass styling.
  </verify>
  <done>
    Dashboard cards are glassy, animated, and use new typography.
  </done>
</task>

## Success Criteria
- [ ] Sidebar is translucent with blur effect.
- [ ] Dashboard elements animate in on load.
- [ ] Stats cards use the glass panel styling.
