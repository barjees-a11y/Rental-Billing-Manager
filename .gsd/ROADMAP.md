# ROADMAP.md

> **Current Phase**: Not started
> **Milestone**: v1.0

## Must-Haves (from SPEC)
- [ ] Excel export contains 100% of contracts due on the 5th, 15th, and 25th
- [ ] UI receives "WOW" reaction (Cyber-Glass aesthetic)
- [ ] Page load LCP under 2.5s

## Phases

### Phase 1: Critical Excel Fixes
**Status**: ✅ Completed
**Objective**: Eliminate data reporting errors in Excel exports to ensure accounting accuracy.
**Key Deliverables**:
- [x] Corrected logic for "5th day" contract inclusion
- [x] Verified export data against database records

### Phase 2: UI Architecture & Theming
**Status**: ✅ Completed
**Objective**: Establish the "Cyber-Glass" design system foundation.
**Key Deliverables**:
- [x] CSS variables for new color palette (deep atmospheric backgrounds)
- [x] Typography updates (non-standard, distinct fonts)
- [x] Base "Glass" component primitives

### Phase 3: Visual Implementation
**Status**: ✅ Completed
**Objective**: Apply the new aesthetic across all key pages.
**Key Deliverables**:
- [x] Dashboard redesign
- [x] Contracts list styling (Sidebar updated, Dashboard cards updated)
- [x] Staggered entry animations
- [ ] Micro-interactions (partially done via hover effects)

### Phase 4: Polish & Performance
**Status**: ✅ Completed
**Objective**: Ensure the visual upgrades don't regress performance.
**Key Deliverables**:
- [x] Polish Secondary Pages (`Contracts`, `Import`, `Settings`)
- [x] LCP optimization (Images preloaded, styles critical)
- [x] Animation performance tuning (`will-change`, `cubic-bezier`)
- [x] Final visual QA

### Phase 5: Bug Fixes
**Status**: ✅ Completed
**Objective**: Fix critical data accuracy issues.
**Key Deliverables**:
- [x] Fix "5th Day" contracts missing by backdating start date to 1st of month
- [x] Restore Excel "Day" column parsing (Override removed)
- [x] Enforce timezone safety in date calculations
