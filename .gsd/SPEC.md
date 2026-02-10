# SPEC.md — Project Specification

> **Status**: `FINALIZED`

## Vision
Transform the Rental Billing Manager into a high-reliability, visually striking platform. We will eliminate critical data reporting errors while applying a distinctive, "non-generic" aesthetic that combines deep atmosphere with fluid motion.

## Goals
1. **Fix Critical Reporting bug**: Ensure Excel exports include ALL due contracts (specifically correcting the "missing 5th day" issue).
2. **Elevate UI Aesthetic**: Implement a "Cyber-Glass" design system with:
   - Distinctive, non-standard typography
   - Deep, atmospheric backgrounds (no solid colors)
   - Staggered entry animations and micro-interactions
   - Cohesive, vibrant color themes (moving away from "system default" blues)

## Non-Goals (Out of Scope)
- Backend logic changes (unless required for data fix)
- New feature development (strictly bug fix + UI polish)

## Users
- Billing Administrators who need 100% accurate monthly reports.
- Daily operators who value a responsive, joyful UI.

## Constraints
- Must maintain current Excel export format for accounting compatibility.
- formatting changes in Excel should be purely cosmetic/readable, not structural.

## Success Criteria
- [ ] Excel export contains 100% of contracts due on the 5th, 15th, and 25th.
- [ ] UI receives "WOW" reaction (subjective) -> measured by distinctive font/color usage.
- [ ] Page load LCP under 2.5s despite new animations.
