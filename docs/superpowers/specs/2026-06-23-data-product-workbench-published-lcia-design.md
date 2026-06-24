# Data Product Workbench And Published LCIA Design

## Context

This is the Next-owned child work for `linancn/tiangong-lca-next#549`, under parent delivery `tiangong-lca/workspace#294`.

The database and Edge work already define the durable LCIA result package model and the command/read surfaces:

- `app_data_product_commands` for manager commands.
- `data_product_results` for public current-package lookup.
- `app_worker_jobs` for the canonical task lifecycle list/read/cancel surface.

Next must not read new database tables directly. The frontend should consume Edge functions and existing worker job APIs so database roles, RLS, and command audit remain backend-owned.

## Goals

- Expose a data processing workbench only to users with the `data_product_manager` system role.
- Add Next service wrappers for data product commands and public published LCIA lookup.
- Add a minimal workbench for creating build requests, previewing packages, publishing packages, unpublishing publications, and tracking package build worker jobs.
- Update public process LCIA display so `/tgdata` can prefer current global public package data without triggering calculation.
- Preserve the existing solver path for private/current-user analysis and as a fallback when the published reader is disabled.

## Non-Goals

- Do not add or change database migrations.
- Do not change Edge authorization semantics from Next.
- Do not implement worker package-build internals.
- Do not add new npm dependencies.
- Do not replace all analysis tooling in `Processes/Analysis`; this work only changes the public process LCIA result reader path and adds the manager workbench entry.

## Architecture

### Access And Navigation

`getInitialState` will map system role `data_product_manager` into `currentUser.access = 'data_product_manager'`. `access.ts` will expose `canDataProductManager` separately from `canAdmin`.

The `/data-processing` route will be gated by `canDataProductManager`. A compact header shortcut will appear only for `data_product_manager` users.

### Service Layer

Create `src/services/dataProducts/api.ts` as the only Next-owned API wrapper for this feature.

It will call:

- `app_data_product_commands` for `create_build`, `preview_package`, `publish_package`, and `unpublish_publication`.
- `data_product_results` for current global/public package lookup by process id/version and optional impact category.
- `requestWorkerJobsApi` for package build worker job listing/read status.

The service will normalize Edge command envelopes into typed results and typed errors. It will also tolerate future `data.values` rows from `data_product_results`; if the deployed Edge response only returns artifact references, Next renders metadata plus an empty row state instead of pretending row values are available.

### Workbench Page

Create `src/pages/DataProcessing/index.tsx`.

MVP tabs:

- Build Requests: create a global eligible package build and show build worker jobs.
- Package Preview: preview a package id and show package metadata, artifact references, input manifest counts, and available impact categories.
- Publication: publish a package id with a default impact category and unpublish a publication id.

This page is operational and compact, matching existing management pages (`ManageSystem`, `Review`) instead of adding a marketing-style page.

### Published LCIA Result Display

`ProcessLciaResultsPanel` will support a new published-package source on public routes (`/tgdata`) when `enablePublishedPackageReader` is true.

Behavior:

- On public data pages, call `getPublishedLciaResultPackage`.
- If no current publication exists, or the process is not in the current package, show a documented empty state and do not call `queryLcaResults`.
- If `data.values` rows are present, map them into the existing LCIA table model and render them with the same table/summary viewer.
- If only artifact refs are returned, show package/publication metadata plus an empty row state and do not trigger calculation.
- On non-public routes, keep current solver behavior.
- When explicitly disabled, keep legacy behavior.

### Error Handling

- Missing manager role renders `AccessDenied` on the page and route access blocks navigation.
- Command failures use the Edge `code/message/status` shape when available.
- Public package lookup failures show a non-blocking error and preserve legacy/base rows only when fallback is explicitly enabled.
- Missing publication or missing process rows are not errors; they render empty state.

## Acceptance

- Only `data_product_manager` users see and enter `/data-processing`.
- The workbench can submit the expected Edge command payloads and render normalized command responses.
- Public `/tgdata` LCIA result display can read and render current package row payload when present.
- Public `/tgdata` LCIA result display renders a clear empty state and does not trigger calculation when no current package, no matching process, or no row payload exists.
- Existing private/current-user result behavior remains covered by existing tests.

## Validation

- Unit tests for `access.ts` and `app.tsx`.
- Unit tests for `src/services/dataProducts/api.ts`.
- Unit tests for `ProcessLciaResultsPanel` published package behavior.
- Unit tests for the `DataProcessing` page.
- Run focused Jest suites first, then `npm run lint`, `npm test`, and `npm run build` before PR handoff when local environment allows.
