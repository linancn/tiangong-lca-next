# 项目配置

## 安装依赖

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

nvm install
nvm alias default 22
nvm use

npm install

npm update && npm ci
```

## 配置文件

您可以在 `package.json` 中修改或添加额外的脚本，以下是一些预置的脚本命令：

### 调试项目

🚀 **使用以下命令启动项目调试** 🚀：

```bash
npm start
```

程序会运行在： [localhost:8000](http://localhost:8000/)

### 检查代码格式

```bash
npm run lint
```

### 检查并自动修复代码格式

```bash
npm run lint:fix
```

### 测试代码

```bash
npm test
```

### 测试覆盖率分析

项目提供了一个强大的测试覆盖率分析脚本 (`scripts/test-coverage-report.js`)，可以详细分析测试覆盖情况。

#### 快速使用

```bash
# 推荐：运行测试并生成详细覆盖率报告
npm run test:report

# 运行测试并生成详细覆盖率报告（同上）
npm run test:coverage:report

# 运行测试并生成标准覆盖率数据（HTML格式）
npm run test:coverage
```

#### 覆盖率配置说明

测试覆盖率的配置在 `jest.config.cjs` 文件中，以下文件类型会被排除在覆盖率统计之外：

- `.d.ts` 类型声明文件
- `.umi` 相关构建文件
- `typings.d.ts` 类型定义文件
- `service-worker.js` Service Worker 文件
- `*.test.{ts,tsx,js,jsx}` 和 `*.spec.{ts,tsx,js,jsx}` 测试文件
- `src/components/index.ts`, `src/locales/en-US.ts`, `src/locales/zh-CN.ts` 简单的重导出文件
- `src/services/**/data.ts` 服务类型定义文件

> **注意**: 覆盖率报告脚本与 Jest 配置保持一致，确保统计的准确性。

#### 覆盖率等级说明

| 图标 | 颜色 | 覆盖率范围 | 说明               |
| ---- | ---- | ---------- | ------------------ |
| ✅   | 绿色 | 100%       | 完美覆盖           |
| 🟢   | 青色 | 80-99%     | 良好覆盖           |
| 🟡   | 黄色 | 50-79%     | 中等覆盖           |
| 🔴   | 红色 | < 50%      | 低覆盖率，需要改进 |

#### 覆盖率指标

报告显示三种覆盖率指标：

1. **行覆盖率（Lines）**：被测试执行的代码行百分比
2. **分支覆盖率（Branches）**：被测试执行的条件分支百分比
3. **函数覆盖率（Functions）**：被测试调用的函数百分比

#### 报告结构

覆盖率报告按照以下方式分类显示：

```
📦 Components    - React 组件
🔧 Services      - 服务和工具函数
📄 Pages         - 页面组件
📁 Others        - 其他文件（配置、国际化等）
```

每个分类都会显示：

- ❌ 无测试覆盖的文件列表
- 📊 有测试覆盖的文件详情（包括三种覆盖率指标）
- 📈 该分类的统计信息

#### 测试文件位置

- 组件测试：`tests/unit/components/`
- 服务测试：`tests/unit/services/`
- 页面测试：`tests/unit/pages/`

#### 编写测试的建议

1. 使用 `@testing-library/react` 进行组件测试
2. Mock 外部依赖（API、路由等）
3. 测试不同的用户交互场景
4. 测试边界情况和错误处理
5. 测试不同的 props 组合

#### 测试相关命令

| 命令                           | 说明                           |
| ------------------------------ | ------------------------------ |
| `npm test`                     | 运行所有测试                   |
| `npm run test:coverage`        | 运行测试并生成覆盖率数据       |
| `npm run test:coverage:report` | 生成可读的覆盖率报告           |
| `npm run test:report`          | 运行测试并生成报告（组合命令） |
| `npm run test:update`          | 更新测试快照                   |

> 💡 **提示**：详细的测试覆盖率脚本使用说明请查看 [`scripts/README_CN.md`](./scripts/README_CN.md)

### 构建项目

```bash
npm run build
```

## 自动发布

项目的 .github/workflows/build.yml 文件中配置了基于 tag 的自动发布流程，只需在本地创建一个符合'v\*'格式的 tag 并推送到远程仓库即可触发发布。通过在项目中配置密钥 CLOUDFLARE_API_TOKEN 和 CLOUDFLARE_ACCOUNT_ID，即可实现自动部署到 Cloudflare Pages。

```bash
# 列出已有标签
git tag

# 创建一个新的标签
git tag v0.0.1

# 将该标签推送到远程
git push origin v0.0.1
```
