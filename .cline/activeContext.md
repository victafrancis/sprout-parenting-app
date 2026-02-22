# Active Context

## Current Task
Weekly Plan UX redesign with flexible markdown-driven views.

## Current Status
- Updated `components/WeeklyPlan.tsx` to support three reading modes: `Cards` (default), `Swipe`, and `Document`.
- Added a heading-based markdown parser (`#`, `##`, `###`) so section order/title changes in markdown remain compatible without hardcoded section names.
- Implemented polished cards rendering for major sections and subsections.
- Implemented vertical swipe experience using existing Embla carousel (`components/ui/carousel.tsx`) with slide progress and “Swipe up” hint.
- Added activity-level slide/card splitting for subsections that contain numbered bold activities (e.g., `**1. ...**`, `**2. ...**`).
- Improved Swipe mode desktop usability:
  - wheel/trackpad support now advances slides when reaching top/bottom boundaries
  - keyboard support (`ArrowUp`, `ArrowDown`, `PageUp`, `PageDown`)
  - explicit `Previous` / `Next` controls for non-touch usage
  - improved hint copy: `Swipe up / wheel / arrow keys`
- Increased Weekly Plan typography for readability:
  - markdown headings enlarged (`h1`, `h2`, `h3`)
  - body/list text increased to `text-base`
  - card/screen titles increased in Cards and Swipe modes
- Product decision update: removed Swipe reader from Weekly Plan for now.
  - `WeeklyPlan.tsx` now exposes only `Cards` (default) and `Document` views.
  - removed carousel/swipe-specific state, handlers, imports, and UI controls.
  - keeps flexible markdown parsing and card-based readability improvements.
- Fixed Weekly Plan view selector layout after Swipe removal:
  - changed tabs grid from `grid-cols-3` to `grid-cols-2`
  - Cards and Document now split evenly with no empty third slot
- TypeScript validation passed (`TS_EXIT_CODE:0`).

## Open Decisions / Blockers
- None.

## Immediate Next Steps
1. Optional UX polish: add compact section quick-jump index for long plans.
2. Optional UX polish: consider collapsible day sections in Cards mode for even faster scanning.

## Last Updated
2026-02-22
