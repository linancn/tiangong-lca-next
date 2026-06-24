# Data Product Workbench Published LCIA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Next UI/service layer for data product package management and public published LCIA result display.

**Architecture:** Add a role-gated `/data-processing` page backed by Edge command wrappers, reuse `worker_jobs` for build lifecycle display, and extend `ProcessLciaResultsPanel` with a published-package source for `/tgdata`. Next never reads the new package/publication tables directly.

**Tech Stack:** Umi Max, React 18, Ant Design 5, Ant Design Pro Components, Supabase JS Edge Functions, Jest, React Testing Library.

---

## File Structure

- Modify `src/typings.d.ts`: allow `currentUser.access` to carry `data_product_manager`.
- Modify `src/access.ts`: add `canDataProductManager`.
- Modify `src/app.tsx`: map system role to access, add a data-processing header shortcut.
- Modify `config/routes.ts`: add `/data-processing` with `access: 'canDataProductManager'`.
- Modify `src/locales/en-US.ts` and `src/locales/zh-CN.ts`: add menu and page labels.
- Create `src/services/dataProducts/api.ts`: Edge command/read wrappers and type normalization.
- Create `src/services/dataProducts/index.ts`: service exports.
- Create `src/pages/DataProcessing/index.tsx`: manager workbench MVP.
- Modify `src/pages/Processes/Components/processLciaResultsPanel.tsx`: add published-package source mode.
- Modify tests under `tests/unit/**` for each changed behavior.

### Task 1: Access, Route, And Header Entry

**Files:**

- Modify: `src/typings.d.ts`
- Modify: `src/access.ts`
- Modify: `src/app.tsx`
- Modify: `config/routes.ts`
- Modify: `src/locales/en-US.ts`
- Modify: `src/locales/zh-CN.ts`
- Test: `tests/unit/access.test.ts`
- Test: `tests/unit/app.test.tsx`
- Test: `tests/unit/config/routes.test.ts`

- [ ] **Step 1: Write the failing access tests**

Add assertions that a `data_product_manager` user receives `canDataProductManager === true` and does not receive `canAdmin === true`.

```ts
it('allows data product managers without granting admin access', () => {
  const result = access({ currentUser: { access: 'data_product_manager' } as any });

  expect(result.canDataProductManager).toBe(true);
  expect(result.canAdmin).toBe(false);
});
```

- [ ] **Step 2: Run the access test and verify RED**

Run: `npm run test:ci -- tests/unit/access.test.ts --runInBand`

Expected: FAIL because `canDataProductManager` is missing.

- [ ] **Step 3: Implement minimal access mapping**

Update `src/access.ts` to return:

```ts
return {
  canAdmin: currentUser?.access === 'admin',
  canDataProductManager: currentUser?.access === 'data_product_manager',
};
```

- [ ] **Step 4: Add failing app/header tests**

Add tests that `getInitialState` maps `data_product_manager` from `getSystemUserRoleApi`, and that `layout().actionsRender()` includes a Data Processing shortcut only for that access value.

```ts
mockGetSystemUserRoleApi.mockResolvedValueOnce({ role: 'data_product_manager' });
const state = await getInitialState();
expect(state.currentUser).toEqual({ name: 'Current User', access: 'data_product_manager' });
```

- [ ] **Step 5: Run app tests and verify RED**

Run: `npm run test:ci -- tests/unit/app.test.tsx --runInBand`

Expected: FAIL because the role is not mapped and no header action exists.

- [ ] **Step 6: Implement app/header changes**

Add `data_product_manager` to a role/access mapping and insert one `HeaderActionIcon` using an existing icon such as `DatabaseOutlined` or `PartitionOutlined`, pushing `/data-processing`.

- [ ] **Step 7: Add route assertion**

Update `tests/unit/config/routes.test.ts` to assert that `/data-processing` exists and uses `access: 'canDataProductManager'`.

- [ ] **Step 8: Run focused tests**

Run:

```bash
npm run test:ci -- tests/unit/access.test.ts tests/unit/app.test.tsx tests/unit/config/routes.test.ts --runInBand
```

Expected: PASS.

### Task 2: Data Product Service API

**Files:**

- Create: `src/services/dataProducts/api.ts`
- Create: `src/services/dataProducts/index.ts`
- Test: `tests/unit/services/dataProducts/api.test.ts`

- [ ] **Step 1: Write failing service tests**

Cover these behaviors:

```ts
await createLciaResultBuildRequest({
  name: 'June public LCIA package',
  coverageMode: 'global_eligible',
  lciaMethodSet: [],
});

expect(mockFunctionsInvoke).toHaveBeenCalledWith('app_data_product_commands', {
  headers: { Authorization: 'Bearer access-token' },
  body: {
    action: 'create_build',
    name: 'June public LCIA package',
    coverageMode: 'global_eligible',
    lciaMethodSet: [],
  },
  region: FunctionRegion.UsEast1,
});
```

Also test:

```ts
await getPublishedLciaResultPackage({
  processId: '11111111-1111-4111-8111-111111111111',
  processVersion: '01.00.000',
  impactCategoryId: 'climate-change',
});

expect(mockFunctionsInvoke).toHaveBeenCalledWith(
  'data_product_results',
  expect.objectContaining({
    body: {
      processId: '11111111-1111-4111-8111-111111111111',
      processVersion: '01.00.000',
      impactCategoryId: 'climate-change',
    },
  }),
);
```

- [ ] **Step 2: Run service test and verify RED**

Run: `npm run test:ci -- tests/unit/services/dataProducts/api.test.ts --runInBand`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement service wrappers**

Create typed functions:

```ts
export async function createLciaResultBuildRequest(request: LciaResultBuildRequest) {
  return invokeDataProductCommand({ action: 'create_build', ...request });
}

export async function previewLciaResultPackage(packageId: string) {
  return invokeDataProductCommand({ action: 'preview_package', packageId });
}

export async function publishLciaResultPackage(request: PublishLciaResultPackageRequest) {
  return invokeDataProductCommand({ action: 'publish_package', ...request });
}

export async function unpublishLciaResultPublication(
  request: UnpublishLciaResultPublicationRequest,
) {
  return invokeDataProductCommand({ action: 'unpublish_publication', ...request });
}
```

Normalize missing auth into an `AUTH_REQUIRED` result without invoking Edge.

- [ ] **Step 4: Run service tests**

Run: `npm run test:ci -- tests/unit/services/dataProducts/api.test.ts --runInBand`

Expected: PASS.

### Task 3: Data Processing Workbench Page

**Files:**

- Create: `src/pages/DataProcessing/index.tsx`
- Test: `tests/unit/pages/DataProcessing/index.test.tsx`

- [ ] **Step 1: Write failing page tests**

Mock data product services and worker jobs. Assert the page:

```ts
expect(screen.getByText('Data Processing')).toBeInTheDocument();
fireEvent.change(screen.getByLabelText('Package name'), { target: { value: 'June package' } });
fireEvent.click(screen.getByRole('button', { name: 'Create build' }));
await waitFor(() => expect(createLciaResultBuildRequest).toHaveBeenCalled());
```

Also assert unauthorized role renders `AccessDenied` when page-level role lookup returns another role.

- [ ] **Step 2: Run page test and verify RED**

Run: `npm run test:ci -- tests/unit/pages/DataProcessing/index.test.tsx --runInBand`

Expected: FAIL because the page does not exist.

- [ ] **Step 3: Implement compact workbench**

Use `PageContainer`, `Tabs`, `Form`, `Input`, `Select`, `Button`, `Descriptions`, `Alert`, and `ProTable`.

Implement three tabs:

- Build Requests: build form and worker job list.
- Package Preview: package id input and metadata display.
- Publication: publish and unpublish forms.

- [ ] **Step 4: Run page tests**

Run: `npm run test:ci -- tests/unit/pages/DataProcessing/index.test.tsx --runInBand`

Expected: PASS.

### Task 4: Published LCIA Source In Process Result Panel

**Files:**

- Modify: `src/pages/Processes/Components/processLciaResultsPanel.tsx`
- Test: `tests/unit/pages/Processes/Components/processLciaResultsPanel.test.tsx`

- [ ] **Step 1: Write failing published-reader tests**

Add tests for `/tgdata/processes` that mock `getPublishedLciaResultPackage`.

Case with rows:

```ts
mockGetPublishedLciaResultPackage.mockResolvedValue({
  publication: { publicationId: 'pub-1', publishedAt: '2026-06-23T00:00:00Z' },
  package: { packageId: 'pkg-1', packageVersion: '2026-06-public' },
  values: [
    {
      impact_id: 'climate-change',
      impact_index: 0,
      impact_name: 'Climate change',
      unit: 'kg CO2 eq',
      value: 42,
    },
  ],
  rowCount: 1,
});
```

Assert `queryLcaResults` is not called and the row renders.

Case without rows:

```ts
mockGetPublishedLciaResultPackage.mockResolvedValue({
  publication: null,
  package: null,
  resultArtifact: null,
  queryArtifact: null,
  rowCount: 0,
});
```

Assert empty state renders and `queryLcaResults` is not called.

- [ ] **Step 2: Run panel test and verify RED**

Run: `npm run test:ci -- tests/unit/pages/Processes/Components/processLciaResultsPanel.test.tsx --runInBand`

Expected: FAIL because the panel has no published source.

- [ ] **Step 3: Implement published source mode**

Add optional props:

```ts
enablePublishedPackageReader?: boolean;
allowPublishedPackageFallback?: boolean;
```

Resolve public route with existing `getDefaultLcaDataScopeForPath`. When the route scope is `open_data` and the reader is enabled, call `getPublishedLciaResultPackage` first. Map `values` into the existing `buildMergedLcaRows` path. If values are absent, show package metadata plus empty state.

- [ ] **Step 4: Run panel tests**

Run: `npm run test:ci -- tests/unit/pages/Processes/Components/processLciaResultsPanel.test.tsx --runInBand`

Expected: PASS.

### Task 5: Focused Regression And Build Validation

**Files:**

- No new source files.

- [ ] **Step 1: Run all touched focused suites**

Run:

```bash
npm run test:ci -- \
  tests/unit/access.test.ts \
  tests/unit/app.test.tsx \
  tests/unit/config/routes.test.ts \
  tests/unit/services/dataProducts/api.test.ts \
  tests/unit/pages/DataProcessing/index.test.tsx \
  tests/unit/pages/Processes/Components/processLciaResultsPanel.test.tsx \
  --runInBand
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 3: Run full unit suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 4: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 5: Commit implementation**

Run:

```bash
git add docs/superpowers src config tests
git commit -m "feat: add data product workbench UI"
```

Expected: one scoped Next commit on `feature/issue-549-data-product-ui`.

- [ ] **Step 6: Push and open PR**

Run:

```bash
git push fork feature/issue-549-data-product-ui
gh pr create --repo linancn/tiangong-lca-next --base dev --head chukeaa:feature/issue-549-data-product-ui --title "feat: add data product workbench UI" --body-file /tmp/issue-549-pr.md
```

Expected: PR targets `dev` and includes `Closes #549`.
