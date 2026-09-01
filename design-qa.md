# National Carbon Organization Contribution Design QA

- Reference: `/Users/foreveryoung/.codex/generated_images/01a057cb-42c1-7f62-b9b7-6f8b386516d6/exec-e08d591c-3e84-497d-be50-9c72ebd3f866.png`
- Implementation route: `/dashboard/national-carbon?screen=organization_contribution&autoplay=0`
- Comparison viewport: `1920 × 1080`
- Locale/state: `zh-CN`, `all` scope, ten ranking rows

## Required intentional differences

- Removed the reference image's right-side organization detail panel.
- Reallocated the released width to a 41% Top 10 panel and 59% ranking panel.
- Replaced the obsolete “未归属数据” KPI with the required “待审核数据” KPI.
- Added the required `过程 / 模型 / 全部` segmented control in the upper-right corner.
- Kept the existing dashboard floating screen navigator; the new screen is `05` and flow topology is `06`.

## Visual checks

- The title, subtitle, data timestamp, four KPI cards, chart, table, methodology footer, and refresh control fit inside one 1920 × 1080 stage with no vertical scroll.
- The visual hierarchy follows the reference: deep navy canvas, cyan/blue primary accents, gold first-place emphasis, thin luminous panel borders, compact tabular density, and fixed-width numeric alignment.
- Long organization names truncate in the chart and remain single-line in the ranking without moving numeric columns.
- All ten chart rows and ranking rows remain visible; the floating navigator does not cover table values.
- The four KPI cards are equal width and the two main panels share a common top and bottom edge.
- No right-side detail affordance, row hover drill-down, drawer trigger, or misleading click cursor is present.

## Interaction checks

- Default scope is `全部`.
- Switching to `过程` updates the visible published total to the process snapshot.
- Switching to `模型` updates the visible published total to the model snapshot.
- The methodology copy updates its active-scope label together with the data.
- Focused unit tests verify that scope switching does not issue another RPC.

## Evidence note

The full-data browser capture used a temporary development-only in-memory snapshot because the new RPC migration was not deployed to the currently running database. That temporary branch code was removed immediately after capture; the production implementation has no mock fallback.

final result: passed
