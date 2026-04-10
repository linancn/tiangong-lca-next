# Pre-Push Gate 规则 – Tiangong LCA Next（中文镜像）

> 本文件定义这个仓库计划采用的 `prepush:gate` 触发策略。在 hook 和 CI 变更真正落地前，`AGENTS.md` 与现有测试文档仍然是当前行为的运行时事实来源。镜像约束：更新本文件时，必须同步更新 `docs/agents/prepush-gate-policy.md`。

## 目标

在保持全仓 `100/100/100/100` 覆盖率要求不变的前提下，把最重的门禁从“每一次 feature 分支 push”移开。

这套策略应该保护真正重要的合并边界：

- 日常 trunk：Git `dev`
- release / promote 分支：Git `main`

但不应该要求每一次本地 feature 分支 push 都等待完整的 `lint + 全量 coverage + 严格断言` 周期。

## 精确门禁命令

完整门禁的权威命令仍然是：

```bash
npm run prepush:gate
```

当前它等价于：

```bash
npm run lint
npm run test:coverage
npm run test:coverage:assert-full
```

这条命令本身不变。策略只调整它**什么时候**自动触发。

## 目标触发规则

### 1. 本地 `pre-push` hook

目标行为：

- 如果当前分支是 `main`，`.husky/pre-push` 必须执行 `npm run prepush:gate`
- 如果当前分支不是 `main`，`.husky/pre-push` 应跳过这条重门禁并成功退出

结果：

- 本地 feature / fix / docs / chore 分支不会在每次 push 时都被完整门禁拦住
- 对 `main` 的直接 push 仍然保留最强的本地保护

### 2. 指向 `dev` 的 pull request

目标行为：

- 所有 base 分支为 `dev` 的 PR，都必须在 GitHub Actions 中执行完整的 `prepush:gate` 等价门禁
- 这条 CI 检查应该被视为必过合并检查

原因：

- `dev` 才是这个仓库真正的日常 trunk
- 最重要的合并保护应该放在 `dev` 的 PR 边界，而不是只放在 `main`

### 3. 指向 `main` 的 pull request

目标行为：

- 所有 base 分支为 `main` 的 PR，也必须在 GitHub Actions 中执行完整的 `prepush:gate` 等价门禁
- 这条 CI 检查也应该被视为必过合并检查

原因：

- `main` 是 promote / release 分支
- 正式发布提升时也应该通过同样严格的全仓质量门禁

### 4. Feature 分支 push

目标行为：

- 向非 `main` 工作分支的普通 push，**不应**自动执行本地重门禁
- 向非受保护分支的普通 push，也不需要额外再跑一条独立的 CI `100%` 重门禁，除非某个专门 workflow 另有要求

原因：

- 这些分支不是最终合并边界
- 重门禁应放在受保护的集成边界，而不是每一个中间检查点 push 上

### 5. 合并完成后的 push

这套策略不应围绕一个单独的“merge 完成”触发器来设计。

原因：

- 合并进 `dev` 或 `main` 时，本身就会在目标分支上产生一次 push
- 如果再额外加一个 `pull_request.closed` 或 “merged” 触发器，会让同一条重门禁重复执行
- 真正权威的合并保护应该来自合并前的必过 PR 检查，而不是合并后的重复补跑

## 手工使用规则

即使本地 hook 在非 `main` 分支上跳过重门禁，开发者和 agent 仍然必须在以下场景主动使用：

```bash
npm run prepush:gate
```

适用场景：

- 在开 PR 或更新 PR 前，想精确复现仓库级完整门禁
- 在高风险重构或大规模测试影响改动前，需要额外信心
- 排查 `dev` / `main` PR 检查中的 CI 失败

简言之：

- 自动触发范围变窄
- 手工完整门禁始终保留

## 为什么更适合采用这套策略

### 保护真正重要的分支边界

这个仓库采用的是 dev-first 分支模型：

- 日常工作先合并进 `dev`
- 再从 `dev` 提升到 `main`

因此，最强自动质量门禁应放在进入 `dev` 和 `main` 的 PR 上，而不是放在每一次本地工作分支 push 上。

### 质量标准不下降

这套策略**不会**降低质量标准。

它保留：

- 全量 lint
- 全量 coverage
- 严格的全仓 `100%` 断言

变化只是把这条重门禁的自动执行位置，移到最重要的分支边界上。

### 降低本地迭代成本

完整门禁本来就是高成本的。让它在每一个 feature 分支 push 上都自动执行，会明显拖慢日常迭代，尤其是：

- 小步 checkpoint push
- 纯文档修改
- 分支间协作
- stacked PR 清理和 review follow-up

仓库仍然能获得这条门禁带来的质量收益，但开发者不需要为每一个中间态 push 都付出完整成本。

## 实施契约

当这套策略真正落地时，应满足：

1. `.husky/pre-push` 根据当前本地分支名分流，只有 `main` 才执行重门禁。
2. GitHub Actions 对所有目标为 `dev` 的 PR 执行完整门禁。
3. GitHub Actions 对所有目标为 `main` 的 PR 执行完整门禁。
4. 分支保护要求这些 CI 检查在合并前必须通过。
5. 所有仍写着“每次本地 push 都执行重门禁”的旧文档，必须在同一改动中一起更新，保证仓库只保留一套一致叙述。

## 简短规则摘要

- 本地自动门禁：仅 `main`
- 必过 CI 门禁：PR 到 `dev`
- 必过 CI 门禁：PR 到 `main`
- 手工完整门禁：始终可以用 `npm run prepush:gate`
- 不要因为 PR merge 同时产生一个 push 事件，就再额外重复执行一次同样的重门禁
