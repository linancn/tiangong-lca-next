# National Carbon Organization Contribution Design QA

- Reference: `/Users/foreveryoung/.codex/generated_images/01a057cb-42c1-7f62-b9b7-6f8b386516d6/exec-e08d591c-3e84-497d-be50-9c72ebd3f866.png`
- Implementation route: `/dashboard/national-carbon?screen=organization_contribution&autoplay=0`
- Comparison viewport: `1920 × 1080`
- Locale/state: `zh-CN`, `all` scope, ten ranking rows

## Required intentional differences

- Removed the reference image's right-side organization detail panel.
- Reallocated the released width to a 41% Top 10 panel and 59% ranking panel.
- Replaced the obsolete “未归属数据” KPI with the required “审核中数据” KPI.
- Added the required `过程 / 模型 / 全部` scope switch in the upper-right corner.
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

## 2026-09-01 Header/Footer Removal And Autoplay Stop

- Source visual truth: `/var/folders/_n/l0ct3k117s53plt200_n0t_00000gn/T/codex-clipboard-698c413a-09dc-4d0d-9df2-7663075b53d0.png`
- Browser-rendered implementation: `/private/tmp/national-carbon-organization-no-header-footer.png`
- Source pixels: `3840 × 1856`, representing the fixed dashboard stage at a high-density capture.
- Implementation pixels / CSS viewport: `1460 × 872`; browser device pixel ratio reported `2`, while the browser screenshot API returned CSS-pixel dimensions.
- State: authenticated `zh-CN`, screen `05`, `全部` scope, live local data.
- Normalization: the dashboard remains a fixed `1920 × 1080` stage and scales within both host viewports. The comparison was focused on the two explicitly red-marked regions and their adjacent content anchors; no density-only finding was filed.

### Full-view comparison evidence

- The title, subtitle, timestamp, decorative header line, methodology copy, refresh-error slot, and manual refresh control are absent.
- The scope switch remains in the upper-right corner.
- KPI cards move upward and the chart/ranking panels extend downward, so removing the two regions does not leave blank structural bands.
- The floating screen navigator remains visible without covering the ranking values.

### Focused region and interaction evidence

- The rendered DOM contains no page-level `h1`, methodology copy, or “刷新数据” button on screen `05`.
- Screen `05` remained active after a browser wait longer than its former 18-second autoplay interval.
- Focused unit coverage proves `04 -> 05` still advances automatically, `05 -> 06` no longer advances automatically, and manual navigation to screen `06` remains available.
- Browser console review found no runtime errors. Existing Umi/Webpack target warnings about top-level `async/await` remain unrelated to this change.

### Comparison history

- Earlier P2: deleting the marked header/footer without reclaiming their space would leave oversized blank bands.
- Fix: moved the KPI row to `82px`, moved the main grid to `232px`, extended it to a `24px` bottom inset, and aligned loading/error overlays to the same content bounds.
- Post-fix evidence: `/private/tmp/national-carbon-organization-no-header-footer.png` shows the remaining dashboard content filling the released space with no overlap or clipping.

No actionable P0/P1/P2 findings remain for this scoped revision.

## 2026-09-01 Review Copy And Subtle Scope Switch

- Source visual truth: `/var/folders/_n/l0ct3k117s53plt200_n0t_00000gn/T/codex-clipboard-5a9dca9e-fd46-4c33-809c-9cad4586f70b.png`
- Browser-rendered implementation: `/private/tmp/national-carbon-organization-subtle-scope-switch.png`
- State: authenticated `zh-CN`, screen `05`, live local data; `全部` was captured after also exercising `过程`.

### Visual and interaction evidence

- The third KPI now reads “审核中数据”; “待审核数据” is absent from the rendered screen.
- The former bordered segmented control is replaced by a compact text-only group with no outer fill, border, or shadow.
- Inactive items use muted text; the active item is identified by brighter text and a thin cyan underline, keeping the control subordinate to the KPI row.
- The group measures about `110 × 23` CSS pixels at the captured viewport and remains clear of the first KPI card.
- Each scope remains a semantic button with `aria-pressed`; the group retains an accessible label.
- Switching to `过程` changed the published total from `5,659` to `5,626` and the recent-30-day value from `4,561` to `4,551`; returning to `全部` restored the original snapshot.
- Browser console review found no runtime errors. Existing Umi/Webpack target warnings about top-level `async/await` remain unrelated to this revision.

### Comparison history

- Earlier P2: the outlined container and filled active pill competed visually with the KPI cards.
- Fix: removed the container chrome and active fill, reduced the control to `13px` labels, and retained only a subtle active underline.
- Post-fix evidence: `/private/tmp/national-carbon-organization-subtle-scope-switch.png` shows the switch as a secondary utility control without overlap or clipping.

No actionable P0/P1/P2 findings remain for this scoped revision.

## 2026-09-01 Enhanced Organization Empty States

- Source visual truth: `/var/folders/_n/l0ct3k117s53plt200_n0t_00000gn/T/codex-clipboard-a0150294-8117-47dd-af30-6ff980ffa50f.png`
- Browser-rendered implementation: `/private/tmp/national-carbon-organization-enhanced-empty-state.png`
- Source pixels: `3840 × 1856`; implementation pixels / CSS viewport: `1460 × 872`.
- State: authenticated `zh-CN`, screen `05`, `模型` scope, live local data with empty organization rankings.
- Normalization: both views render the same fixed `1920 × 1080` dashboard stage at different host scales. The comparison focused on the two empty-state regions, adjacent headers, and panel boundaries.

### Full-view and focused-region evidence

- Both the Top 10 chart and ranking table use the same centered empty-state component.
- Each state combines the existing Ant Design radar and loading-ring icons with cyan glow, a pulsing radar, and a rotating scan ring; no generated or placeholder asset is used.
- The only visible copy is “暂无数据”. The previous long sentence and the proposed English status label are absent.
- The visual measures about `70 × 70` CSS pixels at the captured scale and remains centered within each panel's available content area.
- The ranking header remains fully visible, and neither empty state overlaps panel headers, table columns, the scope switch, or the floating screen navigator.
- Typography, cyan palette, border radius, glow strength, and spacing follow the existing screen-05 visual tokens.
- Both states expose a localized `role="status"` label. Motion is disabled under `prefers-reduced-motion: reduce`.
- Browser console review found no runtime errors. Existing Umi/Webpack target warnings about top-level `async/await` remain unrelated to this revision.

### Comparison history

- Earlier P2: the empty panels contained only a long, low-contrast sentence, leaving the large content regions visually unfinished.
- Fix: introduced a shared radar-scan status component, shortened the visible copy to “暂无数据”, and added reduced-motion handling.
- Post-fix evidence: `/private/tmp/national-carbon-organization-enhanced-empty-state.png` shows consistent, legible empty states centered in both panels without changing the surrounding dashboard hierarchy.

No actionable P0/P1/P2 findings remain for this scoped revision.

## 2026-09-01 Enhanced Organization Loading State

- Source visual truth: `/var/folders/_n/l0ct3k117s53plt200_n0t_00000gn/T/codex-clipboard-087dc532-bcfd-4b7e-9173-08bceebed45d.png`
- Browser-rendered implementation: `/private/tmp/national-carbon-organization-enhanced-loading-state.png`
- Source pixels: `2902 × 1804`; implementation pixels / CSS viewport: `1920 × 872`.
- State: authenticated `zh-CN`, screen `05`, initial organization-contribution loading overlay.
- Normalization: both views show the same fixed `1920 × 1080` dashboard stage at different host scales. The comparison focused on the loading indicator, message, overlay bounds, scope switch, and floating navigator.

### Full-view and focused-region evidence

- The generic purple dot spinner is replaced by a shared blue-cyan data-convergence visual built from three existing Ant Design icons.
- Two loading-ring icons rotate in opposite directions around a pulsing database core, creating a clear active-loading state without adding extra copy.
- The existing “正在汇总单位贡献数据…” message remains centered directly below the indicator with improved cyan-tinted text glow.
- The visual measures about `99 × 99` CSS pixels at the captured scale and remains centered inside the loading overlay.
- The overlay continues to preserve the upper-right scope switch and the lower-right floating screen navigator.
- Typography, colors, glow, border radius, and spatial rhythm align with the screen-05 empty-state treatment and existing dashboard tokens.
- The loading container exposes a localized `role="status"` label with `aria-live="polite"`; all three loading animations stop under `prefers-reduced-motion: reduce`.
- Browser console review found no runtime errors.

### Comparison history

- Earlier P2: the default purple dot spinner looked unrelated to the dashboard's blue-cyan data visualization language and was visually underpowered in the large overlay.
- Fix: replaced the generic spinner with a double-orbit database core, retained the existing loading copy, and added reduced-motion handling.
- Post-fix evidence: `/private/tmp/national-carbon-organization-enhanced-loading-state.png` shows a stronger focal point without changing the loading overlay layout or navigation visibility.

The browser capture used a temporary local preview-only condition so the asynchronous loading frame could be inspected after the RPC completed. That condition was removed immediately after capture; the production component still renders the overlay only while the initial request is pending.

No actionable P0/P1/P2 findings remain for this scoped revision.

final result: passed
