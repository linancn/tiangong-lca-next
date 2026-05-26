# Umi 路由统一实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标：** 统一应用内 React 导航到 Umi 路由能力，只在 Umi 无法接管的边界保留自定义绝对 URL 构造。

**架构：** 应用内路由以 Umi route path 为唯一语义源，例如 `/mydata/processes?id=...`。React UI 中的声明式跳转优先使用 Umi `Link`，命令式跳转继续使用 Umi `history.push` / `history.replace`。`buildExternalUrl` 只保留给必须生成真实 URL 字符串的边界，例如 Supabase 邮件重定向、导出的 HTML、持久化通知链接、外部/存储对象链接。

**技术栈：** Umi 4 / `@umijs/max`、React 18、Ant Design 5、Jest、Testing Library、TypeScript。

---

## 现状盘点

本节是执行前的排查清单。执行任务时先按这些类别确认“哪些要改、哪些不该改”。

### 1. 路由配置源

**文件：** `/Users/biao/Code/lca-workspace/lca-workspace/tiangong-lca-next/config/routes.ts`

当前 Umi route path：

- `/dashboard/national-carbon`
- `/manageSystem`
- `/review`
- `/tgdata`，重定向到 `/tgdata/models`
- `/tgdata/models`
- `/tgdata/processes`
- `/tgdata/flows`
- `/tgdata/flowproperties`
- `/tgdata/unitgroups`
- `/tgdata/sources`
- `/tgdata/contacts`
- `/codata`，重定向到 `/codata/models`
- `/codata/models`
- `/codata/processes`
- `/codata/flows`
- `/codata/flowproperties`
- `/codata/unitgroups`
- `/codata/sources`
- `/codata/contacts`
- `/mydata`，重定向到 `/mydata/models`
- `/mydata/models`
- `/mydata/processes/analysis`
- `/mydata/processes`
- `/mydata/flows`
- `/mydata/flowproperties`
- `/mydata/unitgroups`
- `/mydata/sources`
- `/mydata/contacts`
- `/tedata`，重定向到 `/tedata/models`
- `/tedata/models`
- `/tedata/processes`
- `/tedata/flows`
- `/tedata/flowproperties`
- `/tedata/unitgroups`
- `/tedata/sources`
- `/tedata/contacts`
- `/account`
- `/team`
- `/user/login`
- `/user/login/password_forgot`
- `/user/login/password_reset`
- `/welcome`
- `/admin`
- `/admin/sub-page`
- `/`
- `*`

**配置事实：**

- `/Users/biao/Code/lca-workspace/lca-workspace/tiangong-lca-next/config/config.ts` 当前配置 `history: { type: 'hash' }`。
- 本计划不改 history 类型，只减少 UI 代码对 `/#/...` 序列化细节的直接依赖。

### 2. 已经正确使用 Umi 的导航

这些位置当前已经走 Umi 路由，不应改成手写 URL。

| 文件 | 位置 | 现状 | 处理 |
| --- | --- | --- | --- | --- | --- |
| `src/app.tsx` | `history.push(loginPath)` | 未登录时跳登录 | 保留 |
| `src/app.tsx` | `history.push(dashboardPath)` | 顶部 Dashboard 入口 | 保留 |
| `src/app.tsx` | `<Link to='/umi/plugin/openapi' target='_blank'>` | dev OpenAPI 链接 | 保留，已是 Umi Link |
| `src/app.tsx` | `menuItemRender` 中 `<Link to={menuItemProps.path}>` | 菜单跳转 | 保留 |
| `src/components/RightContent/AvatarDropdown.tsx` | `history.replace({ pathname: '/user/login', search })` | 退出登录 redirect | 保留 |
| `src/components/RightContent/AvatarDropdown.tsx` | `history.push('/manageSystem')` | 用户菜单系统管理 | 保留 |
| `src/components/RightContent/AvatarDropdown.tsx` | `history.push('/review')` | 用户菜单审核 | 保留 |
| `src/components/RightContent/AvatarDropdown.tsx` | `history.push('/team?action=edit')` | 团队入口 | 保留 |
| `src/components/RightContent/AvatarDropdown.tsx` | `history.replace({ pathname: '/team', search })` | 团队创建状态切换 | 保留 |
| `src/components/RightContent/AvatarDropdown.tsx` | `history.push('/team?action=create')` | 团队创建入口 | 保留 |
| `src/components/RightContent/AvatarDropdown.tsx` | `history.push('/account')` | 账户入口 | 保留 |
| `src/pages/404.tsx` | `history.push('/')` | 返回首页 | 保留 |
| `src/pages/Processes/Analysis/index.tsx` | `history.push('/mydata/processes')` | 分析页返回 | 保留 |
| `src/pages/Processes/index.tsx` | `history.push('/mydata/processes/analysis')` | 进入分析页 | 保留 |
| `src/pages/Teams/index.tsx` | `history.replace('/team?action=edit')` | 团队页状态同步 | 保留 |
| `src/pages/User/Login/index.tsx` | `history.push(urlParams.get('redirect') |  | '/')` | 登录后跳转 | 保留，但需确认 redirect 安全性不是本计划范围 |
| `src/pages/User/Login/password_forgot.tsx` | `<Link to='/'>` | 返回首页 | 保留 |
| `src/pages/User/Login/password_reset.tsx` | `history.push('/')` | 重置后返回首页 | 保留 |
| `src/pages/Welcome.tsx` | `history.push('/tgdata/models?tid=...')` | 团队数据入口 | 保留 |

### 3. 当前 UI 中直接构造 hash/internal URL 的位置

这些是本计划的主要改造对象。

| 文件 | 位置 | 现状 | 目标 |
| --- | --- | --- | --- |
| `src/pages/User/Login/index.tsx` | `href={buildAppHashPath('/user/login/password_forgot')}` | React UI 直接使用 hash URL helper | 改为 Umi `<Link to='/user/login/password_forgot'>` |
| `src/components/Notification/DataNotification.tsx` | `buildExternalUrl('/mydata/...')` + `window.open(...)` | 表格操作按钮生成绝对 hash URL 并新开页 | 普通记录改为 Umi `Link target='_blank'`；拒绝记录保留按钮打开 modal，modal footer 用 Umi `Link` |

### 4. 必须保留绝对 URL helper 的边界

这些不是普通 React UI 导航，不能简单改成 Umi `Link`。

| 文件 | 位置 | 原因 | 处理 |
| --- | --- | --- | --- |
| `src/services/auth/password.ts` | `supabase.auth.resetPasswordForEmail(..., { redirectTo })` | 邮件客户端和 Supabase 需要完整 URL，Umi 不在该环境运行 | 保留 `buildExternalUrl('/user/login/password_reset')` |
| `src/pages/Utils/review.tsx` | `getDatasetDetailUrl()` / `ValidationIssue.link` | link 会进入 validation issue 数据结构，后续可被通知、导出 HTML、`window.open` 使用 | 保留绝对 URL，但重命名为 `getDatasetDetailAbsoluteUrl` 明确语义 |
| `src/components/ValidationIssueModal/index.tsx` | 导出 HTML 中 `<a href="...">` | 下载后的 HTML 是独立文档，不能依赖 Umi runtime | 保留绝对 URL |
| `src/components/ValidationIssueModal/index.tsx` | `openValidationIssueLink(link)` | 打开的 link 来自 validation issue 数据，不一定是当前 React render 可控的 Umi route | 保留，但依赖上游生成 hash-compatible 绝对 URL |
| `src/services/notifications/api.ts` | `link: normalizeNotificationLink(...)` | 通知 link 是持久化/服务端返回数据 | 保留 link 字符串模型 |
| `src/components/Notification/IssueNotification.tsx` | `window.open(safeLink, '_blank', ...)` | issue notification 打开持久化 link，可能是内部绝对 URL 或外部 URL | 保留；本计划只验证安全过滤和 hash-compatible 数据来源 |

### 5. 外部链接、静态文件和对象 URL

这些不是 Umi 应用内路由，默认不改。

| 文件 | 位置 | 类型 | 处理 |
| --- | --- | --- | --- |
| `src/pages/Admin.tsx` | `https://pro.ant.design/docs/block-cn` | 外部文档 | 保留原生 `<a>` |
| `src/components/ImportTidasPackage/index.tsx` | `https://docs.tiangong.earth` / `<Typography.Link href={docsUrl}>` | 外部文档 | 保留 |
| `src/components/RightContent/index.tsx` | `window.open(docsUrl)` | 外部文档 | 保留 |
| `src/pages/User/Login/Components/LoginTopActions.tsx` | `window.open(docsUrl)` | 外部文档 | 保留 |
| `src/pages/User/Login/index.tsx` | `/terms_of_use.html` | public 静态文件 | 保留 AntD `Typography.Link href` |
| `src/pages/User/Login/index.tsx` | `/privacy_notice.html` | public 静态文件 | 保留 AntD `Typography.Link href` |
| `src/pages/Welcome.tsx` | `href='#'` | 本页锚点/占位式交互 | 不纳入本计划；如要清理另开任务 |
| `src/pages/Welcome.tsx` | `tidasDocUrl` | 外部 TIDAS 文档 | 保留 |
| `src/pages/Sources/Components/view.tsx` | `sourceCitation` 的 `Button href` | 用户/数据源外部 URL | 保留，但可单独修 `target='blank'` 为 `target='_blank'`，不属于本计划主线 |
| `src/components/Footer/index.tsx` | `https://www.tiangong.earth`、GitHub URL | 外部链接 | 保留 |
| `src/components/FileViewer/gallery.tsx` | `window.open(res.url, '_blank')` | 文件/存储 URL | 保留 |
| `src/pages/Sources/Components/form.tsx` | `window.open(res.url, '_blank')` | 文件/存储 URL | 保留 |
| `src/components/ImportTidasPackage/index.tsx` | `URL.createObjectURL(blob)` | 下载对象 URL | 保留 |
| `src/components/ValidationIssueModal/index.tsx` | `URL.createObjectURL(blob)` | 下载对象 URL | 保留 |
| `src/services/general/api.ts` | `URL.createObjectURL(blob)` | 下载对象 URL | 保留 |
| `src/services/supabase/storage.ts` | `URL.createObjectURL(...)` | 本地预览对象 URL | 保留 |

### 6. 查询参数读取/构造点

这些是 route state 解析或构造，不是 hash URL 序列化。默认不改，但测试时要避免破坏。

| 文件 | 用途 |
| --- | --- |
| `src/app.tsx` | 从 `history.location.search` 读取 `tid`，给菜单 path 追加 `?tid=...` |
| `src/components/RightContent/AvatarDropdown.tsx` | 读取/构造 login redirect、team action |
| `src/pages/User/Login/index.tsx` | 读取 `redirect` 参数 |
| `src/pages/NationalCarbonDashboard/index.tsx` | 从 hash/search 读取 dashboard 参数 |
| `src/pages/Flows/index.tsx` | 读取列表页查询参数 |
| `src/pages/Sources/index.tsx` | 读取列表页查询参数 |
| `src/pages/Unitgroups/index.tsx` | 读取列表页查询参数 |
| `src/pages/Contacts/index.tsx` | 读取列表页查询参数 |
| `src/pages/LifeCycleModels/index.tsx` | 读取列表页查询参数 |
| `src/pages/Processes/index.tsx` | 读取列表页查询参数 |
| `src/pages/Teams/index.tsx` | 读取 `action` 参数 |
| `src/pages/LifeCycleModels/Components/connectableProcesses/index.tsx` | 读取 `tid` 参数 |
| `src/pages/Utils/review.tsx` | 用 `URLSearchParams` 构造 dataset detail route/query |

### 7. 数据标准 URL / XML namespace / permanentDataSetURI

源码中还有大量 `http://lca.jrc...`、`https://lcdn.tiangong.earth/...`、`@xmlns`、`@xsi:schemaLocation`、`common:permanentDataSetURI`。这些是数据格式、ILCD/TIDAS 元数据或永久数据集 URI，不是 Umi 应用路由。本计划不修改这些内容。

### 8. 相关测试覆盖点

执行时重点更新这些测试：

- `tests/unit/utils/appUrl.test.ts`
- `tests/unit/pages/User/Login/index.test.tsx`
- `tests/unit/components/DataNotification.test.tsx`
- `tests/unit/services/auth/password.test.ts`
- `tests/unit/utils/review.validation.test.ts`
- `tests/unit/components/ValidationIssueModal.test.tsx`，只在改名或绝对 URL 语义影响到它时调整
- `tests/unit/components/IssueNotification.test.tsx`，只做回归确认，默认不改

---

## 实施任务

### Task 0：交付准备

**文件：**

- 读取：`/Users/biao/Code/lca-workspace/lca-workspace/AGENTS.md`
- 读取：`/Users/biao/Code/lca-workspace/lca-workspace/_docs/workspace-branch-policy-contract.md`
- 读取：`/Users/biao/Code/lca-workspace/lca-workspace/tiangong-lca-next/AGENTS.md`
- 读取：`/Users/biao/Code/lca-workspace/lca-workspace/tiangong-lca-next/docs/agents/repo-validation.md`

**Step 1：确认跟踪记录**

实施前确认已有可执行 GitHub Issue 和 Project item。

期望：

- 目标仓库是 `linancn/tiangong-lca-next`。
- routine branch base 是 `dev`。
- Issue scope 明确是“Umi 路由统一”，并明确不改变 `history: { type: 'hash' }`。

**Step 2：从 daily trunk 创建分支**

运行：

```bash
git fetch origin dev
git switch -c fix/issue-<id>-umi-routing origin/dev
```

期望：

- 分支基于 `origin/dev`。
- 不包含无关本地改动。

**Step 3：同步 Project 状态**

第一次代码编辑前，把对应 Project item 更新为 `In Progress`。

### Task 1：收紧 app URL helper 的公共边界

**文件：**

- 修改：`/Users/biao/Code/lca-workspace/lca-workspace/tiangong-lca-next/src/utils/appUrl.ts`
- 修改：`/Users/biao/Code/lca-workspace/lca-workspace/tiangong-lca-next/tests/unit/utils/appUrl.test.ts`

**Step 1：先写失败测试**

把 `buildAppHashPath` 的测试改成“helper 只服务绝对 URL 边界”的测试：

```ts
import { buildExternalUrl, getAppOrigin } from '@/utils/appUrl';

describe('appUrl helpers', () => {
  it('returns the browser origin when window is available', () => {
    expect(getAppOrigin()).toBe('http://localhost:8000');
  });

  it('falls back to the production origin when window is unavailable', () => {
    const originalWindow = global.window;
    Object.defineProperty(global, 'window', {
      configurable: true,
      value: undefined,
    });

    try {
      expect(getAppOrigin()).toBe('https://lca.tiangong.earth');
      expect(buildExternalUrl('/user/login/password_reset')).toBe(
        'https://lca.tiangong.earth/#/user/login/password_reset',
      );
    } finally {
      Object.defineProperty(global, 'window', {
        configurable: true,
        value: originalWindow,
      });
    }
  });

  it('builds absolute app urls for off-app consumers and trims trailing slashes', () => {
    expect(buildExternalUrl('/user/login/password_reset', 'https://demo.example/')).toBe(
      'https://demo.example/#/user/login/password_reset',
    );
  });

  it('normalizes already-hashed route input before building absolute URLs', () => {
    expect(buildExternalUrl('/#/user/login/password_reset', 'https://demo.example')).toBe(
      'https://demo.example/#/user/login/password_reset',
    );
    expect(buildExternalUrl('#/user/login/password_reset', 'https://demo.example')).toBe(
      'https://demo.example/#/user/login/password_reset',
    );
  });
});
```

**Step 2：运行目标测试确认失败**

运行：

```bash
npx jest tests/unit/utils/appUrl.test.ts --runInBand --testTimeout=20000
```

期望：

- FAIL，因为当前测试和导出仍包含 `buildAppHashPath`。

**Step 3：改实现**

把 `buildAppHashPath` 改成模块内部函数，不再导出：

```ts
const DEFAULT_APP_ORIGIN = 'https://lca.tiangong.earth';

const normalizeAppPath = (path: string) => {
  if (!path) {
    return '/';
  }

  if (path.startsWith('/#/')) {
    return path.slice(2);
  }

  if (path.startsWith('#/')) {
    return path.slice(1);
  }

  return path.startsWith('/') ? path : `/${path}`;
};

const normalizeOrigin = (origin: string) => origin.replace(/\/+$/, '');

const buildHashHistoryPath = (path: string) => `/#${normalizeAppPath(path)}`;

export const getAppOrigin = () =>
  typeof window !== 'undefined' ? window.location.origin : DEFAULT_APP_ORIGIN;

export const buildExternalUrl = (path: string, origin: string = getAppOrigin()) =>
  `${normalizeOrigin(origin)}${buildHashHistoryPath(path)}`;
```

**Step 4：运行目标测试确认通过**

运行：

```bash
npx jest tests/unit/utils/appUrl.test.ts --runInBand --testTimeout=20000
```

期望：

- PASS。

**Step 5：提交**

运行：

```bash
git add src/utils/appUrl.ts tests/unit/utils/appUrl.test.ts
git commit -m "test: define app url helper boundary"
```

### Task 2：登录页忘记密码入口改用 Umi Link

**文件：**

- 修改：`/Users/biao/Code/lca-workspace/lca-workspace/tiangong-lca-next/src/pages/User/Login/index.tsx`
- 修改：`/Users/biao/Code/lca-workspace/lca-workspace/tiangong-lca-next/tests/unit/pages/User/Login/index.test.tsx`

**Step 1：先写失败测试**

把现有 “hash-compatible app route” 测试改成 Umi route 语义测试：

```ts
it('renders the forgot-password link as an Umi app route', () => {
  render(<LoginPage />);

  const link = screen.getByText('Forgot password').closest('a');
  expect(link).toHaveAttribute('href', expect.stringContaining('/user/login/password_forgot'));
  expect(link).not.toHaveAttribute('href', '/user/login/password_forgot');
});
```

说明：

- 第一条确认目标 route。
- 第二条防止退回原生 browser-history path。
- 测试不强耦合 `/#/...` 的最终序列化。

**Step 2：运行目标测试确认失败**

运行：

```bash
npx jest tests/unit/pages/User/Login/index.test.tsx --runInBand --testTimeout=20000
```

期望：

- FAIL，因为组件仍直接 import/use `buildAppHashPath`。

**Step 3：改组件**

修改 imports：

```ts
- import { Helmet, history, useIntl, useLocation, useModel } from 'umi';
+ import { Helmet, Link, history, useIntl, useLocation, useModel } from 'umi';
```

删除：

```ts
import { buildAppHashPath } from '@/utils/appUrl';
```

避免和 AntD `Typography.Link` 命名冲突：

```ts
- const { Link } = Typography;
+ const { Link: TypographyLink } = Typography;
```

静态文件链接继续用 AntD：

```tsx
<TypographyLink href='/terms_of_use.html' target='_blank' rel='noopener noreferrer'>
  <FormattedMessage id='pages.login.termsOfUse' defaultMessage='Terms of Use' />
</TypographyLink>
```

```tsx
<TypographyLink href='/privacy_notice.html' target='_blank' rel='noopener noreferrer'>
  <FormattedMessage id='pages.login.privacyNotice' defaultMessage='Privacy Notice' />
</TypographyLink>
```

忘记密码入口改为：

```tsx
<Link
  style={{
    float: 'right',
  }}
  to='/user/login/password_forgot'
>
  <FormattedMessage id='pages.login.forgotPassword' defaultMessage='Forgot password' />
</Link>
```

**Step 4：运行目标测试确认通过**

运行：

```bash
npx jest tests/unit/pages/User/Login/index.test.tsx --runInBand --testTimeout=20000
```

期望：

- PASS。

**Step 5：提交**

运行：

```bash
git add src/pages/User/Login/index.tsx tests/unit/pages/User/Login/index.test.tsx
git commit -m "fix: route forgot password link through umi"
```

### Task 3：DataNotification 的 UI 跳转改用 Umi Link

**文件：**

- 修改：`/Users/biao/Code/lca-workspace/lca-workspace/tiangong-lca-next/src/components/Notification/DataNotification.tsx`
- 修改：`/Users/biao/Code/lca-workspace/lca-workspace/tiangong-lca-next/tests/unit/components/DataNotification.test.tsx`

**Step 1：先写失败测试**

把非拒绝记录的 `window.open` 断言改成 link 断言：

```ts
it('renders process view route as an Umi link for non-rejected process notifications', async () => {
  render(
    <ConfigProvider>
      <DataNotification {...defaultProps} />
    </ConfigProvider>,
  );

  const viewLink = await screen.findByRole('link', { name: 'View' });

  expect(viewLink).toHaveAttribute('target', '_blank');
  expect(viewLink).toHaveAttribute('rel', expect.stringContaining('noopener'));
  expect(viewLink).toHaveAttribute('href', expect.stringContaining('/mydata/processes'));
  expect(viewLink).toHaveAttribute('href', expect.stringContaining('id=process-1'));
  expect(viewLink).toHaveAttribute('href', expect.stringContaining('version=1.0.0'));
  expect(viewLink).toHaveAttribute('href', expect.stringContaining('mode=view'));
});
```

拒绝记录 modal 测试保留，但把 “Fix Data” 改成 link 断言：

```ts
expect(screen.getByRole('link', { name: 'Fix Data' })).toHaveAttribute(
  'href',
  expect.stringContaining('/mydata/processes'),
);
```

**Step 2：运行目标测试确认失败**

运行：

```bash
npx jest tests/unit/components/DataNotification.test.tsx --runInBand --testTimeout=20000
```

期望：

- FAIL，因为组件仍通过 `window.open(getNotificationDataPath(...))` 打开。

**Step 3：组件改为返回 route path**

删除：

```ts
import { buildExternalUrl } from '@/utils/appUrl';
```

改 import：

```ts
- import { useIntl } from 'umi';
+ import { Link, useIntl } from 'umi';
```

把 `getNotificationDataPath` 改成 Umi route path：

```ts
const getNotificationDataRoute = (
  record: DataNotificationItem,
  mode: 'view' | 'edit',
  options: { forceProcess?: boolean } = {},
) => {
  const dataId = record?.json?.data?.id ?? '';
  const dataVersion = record?.json?.data?.version ?? '';
  const basePath =
    options.forceProcess || !record.isFromLifeCycle ? '/mydata/processes' : '/mydata/models';
  return `${basePath}?id=${encodeURIComponent(dataId)}&version=${encodeURIComponent(
    dataVersion,
  )}&mode=${mode}`;
};
```

删除 `openNotificationData`。

**Step 4：按交互类型拆分 action**

拒绝记录仍然是按钮，因为要先打开拒绝原因 modal：

```tsx
const renderAction = (record: DataNotificationItem) => {
  const label = intl.formatMessage({ id: 'pages.review.table.view', defaultMessage: 'View' });

  if (record.stateCode === -1) {
    return (
      <Button
        type='link'
        size='small'
        style={{ color: token.colorPrimary }}
        onClick={() => setSelectedRejectedRecord(record)}
      >
        {label}
      </Button>
    );
  }

  return (
    <Link
      className='ant-btn ant-btn-link ant-btn-sm'
      style={{ color: token.colorPrimary }}
      target='_blank'
      rel='noopener noreferrer'
      to={getNotificationDataRoute(record, 'view')}
    >
      <span>{label}</span>
    </Link>
  );
};
```

table column 使用：

```tsx
render: (record: DataNotificationItem) => <Space>{renderAction(record)}</Space>,
```

**Step 5：modal footer 改成 Umi Link**

把 modal 的 `onOk` / `okText` / `cancelText` 改为自定义 footer：

```tsx
footer={
  selectedRejectedRecord
    ? [
        <Button key='close' onClick={() => setSelectedRejectedRecord(null)}>
          {intl.formatMessage({
            id: 'notifications.data.rejectionModal.close',
            defaultMessage: 'Close',
          })}
        </Button>,
        <Link
          key='fix'
          className='ant-btn ant-btn-primary'
          target='_blank'
          rel='noopener noreferrer'
          to={getNotificationDataRoute(selectedRejectedRecord, 'edit', { forceProcess: true })}
          onClick={() => setSelectedRejectedRecord(null)}
        >
          <span>
            {intl.formatMessage({
              id: 'notifications.data.rejectionModal.fix',
              defaultMessage: 'Fix Data',
            })}
          </span>
        </Link>,
      ]
    : undefined
}
```

**Step 6：运行目标测试确认通过**

运行：

```bash
npx jest tests/unit/components/DataNotification.test.tsx --runInBand --testTimeout=20000
```

期望：

- PASS。

**Step 7：提交**

运行：

```bash
git add src/components/Notification/DataNotification.tsx tests/unit/components/DataNotification.test.tsx
git commit -m "fix: use umi links for data notification routes"
```

### Task 4：Validation issue 保留绝对 URL，但改名明确语义

**文件：**

- 修改：`/Users/biao/Code/lca-workspace/lca-workspace/tiangong-lca-next/src/pages/Utils/review.tsx`
- 修改：`/Users/biao/Code/lca-workspace/lca-workspace/tiangong-lca-next/tests/unit/utils/review.validation.test.ts`
- 回归：`/Users/biao/Code/lca-workspace/lca-workspace/tiangong-lca-next/src/components/ValidationIssueModal/index.tsx`

**Step 1：保持 link 为绝对 URL 的决策**

不要把 `ValidationIssue.link` 改成 Umi `Link` 或纯 route path，因为它会：

- 写入下载的 HTML。
- 作为通知 payload 调用 `upsertValidationIssueNotification`。
- 作为持久化 link 被 `IssueNotification` 打开。
- 在 modal 中通过 `window.open` 打开。

**Step 2：重命名 helper**

在 `src/pages/Utils/review.tsx` 中把：

```ts
export const getDatasetDetailUrl = (ref: refDataType, origin?: string) => {
```

改成：

```ts
export const getDatasetDetailAbsoluteUrl = (ref: refDataType, origin?: string) => {
```

同步更新 `buildValidationIssues` 内部所有调用。

**Step 3：更新测试 import 和测试名称**

在 `tests/unit/utils/review.validation.test.ts` 中更新：

```ts
getDatasetDetailAbsoluteUrl,
```

绝对 URL 断言保持不变：

```ts
expect(getDatasetDetailAbsoluteUrl(ref, 'https://demo.example')).toBe(
  'https://demo.example/#/mydata/processes?id=process-1&version=01.00.000&required=1',
);
```

**Step 4：运行目标测试**

运行：

```bash
npx jest tests/unit/utils/review.validation.test.ts --runInBand --testTimeout=20000
```

期望：

- PASS。

**Step 5：提交**

运行：

```bash
git add src/pages/Utils/review.tsx tests/unit/utils/review.validation.test.ts
git commit -m "refactor: clarify validation issue absolute urls"
```

### Task 5：按现状盘点做全量排查

**文件：**

- 检查：`/Users/biao/Code/lca-workspace/lca-workspace/tiangong-lca-next/src`
- 检查：`/Users/biao/Code/lca-workspace/lca-workspace/tiangong-lca-next/tests/unit`

**Step 1：确认没有 UI 继续依赖 hash helper**

运行：

```bash
rg -n "buildAppHashPath|/#/|href=\\{buildApp|window\\.open\\(buildApp" src tests/unit
```

期望：

- `buildAppHashPath` 不存在。
- `/#/` 只出现在 `appUrl` 测试、absolute URL 边界测试或既有 validation/notification 绝对 URL 断言中。
- React UI 组件不再为了普通应用内导航手写 `/#/...`。

**Step 2：确认没有原生 href 指向应用内路由**

运行：

```bash
rg -n "href=(['\\\"]/[A-Za-z0-9_#?./-]+|\\{[^}]*'/)" src
```

允许：

- `/terms_of_use.html`
- `/privacy_notice.html`
- `src/global.less` 中针对 `/umi/plugin/openapi` 的样式选择器
- `href='#'` 这种既有锚点/占位逻辑，暂不纳入本计划

不允许：

- `/user/...`
- `/mydata/...`
- `/tgdata/...`
- `/codata/...`
- `/tedata/...`
- `/review`
- `/team`
- `/account`
- `/manageSystem`

这些如果出现在 React UI 原生 `href` 中，应改成 Umi `Link` 或 `history`。

**Step 3：确认 window.open 分类正确**

运行：

```bash
rg -n "window\\.open\\(" src
```

允许：

- 外部文档 URL：`docs.tiangong.earth`、`tidas.tiangong.earth` 等。
- 文件/存储 URL：`res.url`。
- 持久化通知/validation link。

不允许：

- 在 React UI 中直接 `window.open('/mydata/...')`。
- 在 React UI 中直接 `window.open(buildExternalUrl('/mydata/...'))`。

**Step 4：确认查询参数逻辑未破坏**

运行相关 focused tests，尤其覆盖：

- 登录 redirect。
- team action。
- `/mydata/processes/analysis` 跳转。
- DataNotification 的 `id/version/mode` query。

**Step 5：如有遗漏，补小提交**

如果排查发现遗漏，修复后提交：

```bash
git add <changed-files>
git commit -m "chore: remove leftover manual app route links"
```

如果没有遗漏，不要创建空提交。

### Task 6：验证与 PR 交付

**文件：**

- 参考：`/Users/biao/Code/lca-workspace/lca-workspace/tiangong-lca-next/package.json`
- 参考：`/Users/biao/Code/lca-workspace/lca-workspace/tiangong-lca-next/docs/agents/repo-validation.md`

**Step 1：运行 focused tests**

运行：

```bash
npx jest tests/unit/utils/appUrl.test.ts tests/unit/pages/User/Login/index.test.tsx tests/unit/components/DataNotification.test.tsx tests/unit/services/auth/password.test.ts tests/unit/utils/review.validation.test.ts --runInBand --testTimeout=20000
```

期望：

- PASS。

**Step 2：运行 TypeScript**

运行：

```bash
npm run tsc
```

期望：

- PASS。

**Step 3：运行 CI 风格测试**

运行：

```bash
npm run test:ci
```

期望：

- PASS。

**Step 4：运行 protected-branch parity gate**

运行：

```bash
npm run prepush:gate
```

期望：

- PASS。

**Step 5：打开 PR**

推送分支并开 PR 到 `dev`，不是 `main`：

```bash
git push -u <push-remote> fix/issue-<id>-umi-routing
```

PR body 必须包含：

- `Closes #<id>`
- Summary：React UI 内部导航改用 Umi `Link` / route path；绝对 URL helper 仅保留给 off-app boundary。
- Validation：列出上面实际跑过的命令和结果。
- Risk：`DataNotification` modal footer 从默认 OK 按钮改为 link button，需要关注样式和新开页行为。
- Workspace Integration：合并后如要进入 workspace delivery，需要 root submodule bump。

**Step 6：同步 Issue / Project**

PR 打开后：

- 把 PR 关联到 Issue。
- 按 workspace delivery workflow 更新 Project 状态。
- 在 Issue 评论中记录路由边界决策。

建议评论：

```markdown
Implemented routing boundary decision:

- React UI internal navigation uses Umi `Link` / route paths.
- Custom hash absolute URL generation remains only for off-app consumers: Supabase email redirect, exported validation HTML, persisted notification links, and external/storage URLs.
- The app still runs with `history: { type: 'hash' }`; this change does not alter history mode.
```

**Step 7：合并后的 workspace integration**

PR 合并后，按 root workspace 流程处理：

- 根据 workspace branch policy 确认 child SHA 是否适合进入 root。
- 精确更新 `tiangong-lca-next` submodule pointer。
- 按需运行 workspace-level validation。
- 按策略打开或更新 root integration PR。
