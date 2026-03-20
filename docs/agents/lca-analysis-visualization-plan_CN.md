# LCA 分析与可视化方案

最后更新：2026-03-12

## 1. 目标

本文档用于定义 `tiangong-lca-next` 中 LCA 分析与可视化能力的分阶段方案。

方案综合了以下三部分结论：

- openLCA、Brightway 常见的 LCA 分析方法，
- Tiangong 当前求解与查询链路已经具备的能力，
- `tiangong-lca-next` 现有前端风格以及 Ant Design Charts 2.6.7 组件选型。

这是一份产品与实施方案，不是 solver 内部实现说明。

## 2. 当前基线

## 2.1 当前栈已经具备的能力

- `tiangong-lca-next` 在 `src/services/lca/api.ts` 中已经定义了两种结果查询模式：
  - `process_all_impacts`
  - `processes_one_impact`
- process 详情抽屉已经调用 `process_all_impacts`，并使用 `ProTable` 展示 solver 返回的 LCIA 结果。
- solver 栈已经具备：
  - snapshot 级 `process_map` 与 `impact_map`，
  - `solve_all_unit`，
  - latest all-unit 指针，
  - 便于查询的 all-unit sidecar artifact。

## 2.2 当前最重要的技术边界

当前 `solve_all_unit` 的结果基线是 `h-only`。

这意味着当前系统非常适合做：

- impact profile，
- hotspots，
- 排名，
- 对比，
- 分组汇总。

但它还不足以单独支撑真正的贡献树或 Sankey 路径分析。后者需要基于 `solve_one(return_x/g/h=true)` 的路径型接口和遍历逻辑。

## 2.3 当前前端风格

`tiangong-lca-next` 当前属于稳定的企业后台风格：

- Ant Design Pro 布局，
- `Drawer`、`Card`、`Descriptions`、`Tabs`、`ProTable`，
- light/dark 双主题，
- `config/branding.ts` 中定义的品牌主色。

这意味着第一批图表应该是现有产品页面的增强，而不是完全脱离上下文的新大屏。

## 2.4 依赖约束

仓库当前并未引入 Ant Design Charts 相关图表依赖，且 `AGENTS.md` 明确要求新增 npm 依赖前必须获得人工批准。

因此本方案会区分：

- 应该做什么，
- 预期采用什么图表组件，
- 哪些内容仍然依赖后续批准。

## 3. 产品目标

第一版分析与可视化能力，应该帮助用户快速回答以下四个问题：

1. 对某一个 process 来说，哪些 impact category 较高？
2. 对某一个 impact category 来说，哪些 process 是主要 hotspot？
3. 在几个候选 process 之间，某一个 impact 上谁更高、谁更低？
4. 当前展示的数值来自哪个 snapshot、哪个 result、哪个 source？

第一版不追求完整复刻桌面 LCA 工具的全部分析深度，而是先在当前查询链路上做出清晰、可追溯、适合 Web 的分析层。

## 4. 设计原则

## 4.1 可追溯优先

每个分析视图都必须展示：

- `snapshot_id`
- `result_id`
- `source`
- `computed_at`

图表用于解释，表格和元数据仍然是结果真值。

## 4.2 图表补充表格，而不是替代表格

不要把 `ProTable` 直接替换掉。每个分析面板都应该保留精确值表格或可钻取的明细表。

## 4.3 保持现有页面节奏

一期优先采用：

- 在现有抽屉和页面内部嵌入图表，
- 使用紧凑型概要卡片，
- 图表置于表格上方或旁侧。

除非业务流程确实需要，否则不先做重量级独立 dashboard。

## 4.4 优先使用稳健图型，不追求花哨图型

LCA 早期分析的核心价值在于排序和比较，而不是视觉新奇。

因此：

- 优先 `Bar`、`DualAxes`、`Bullet`，
- `Radar` 仅在归一化且类别数较少时使用，
- `Sankey` 延后到路径数据具备之后，
- 不把 `Pie` 作为主分析图。

## 4.5 明确归一化语义

LCIA category 通常单位不同、量级不同。

因此：

- 原始值应保留在表格中，
- 同一张图中跨 impact category 的 profile 应使用归一化值，
- UI 必须明确标注当前显示的是原始值还是归一化值。

## 5. 推荐分析范围

## 5.1 一期：直接建立在现有 API 之上

一期是最小可用版本，应作为默认目标。

### A. Process Profile

目标：

- 查看单个 process 的全部 impacts。

数据来源：

- `process_all_impacts`

主要承载位置：

- 现有 process 详情抽屉中的 solver LCIA 区块。

图表建议：

- 主图：`Bar`
- 可选切换：归一化 `Radar`

原因：

- `Bar` 对长名称和混合量级最稳，
- `Radar` 只有在归一化且 impact 数量可控时才有意义。

输出形式：

- 概要卡片，
- profile 图，
- 下方保留现有 `ProTable` 作为精确值区域。

### B. Impact Hotspots

目标：

- 在某一个 impact category 下查看 process 排名。

数据来源：

- `processes_one_impact`
- 如果页面要做全 snapshot 排名，则 query API 需要补 server-side 排序、`top_n`、分页能力。

主要承载位置：

- 新增一个轻量级的 `LCA Analysis` 页面或 tab。

图表建议：

- 主图：`Bar`
- 辅图：`DualAxes` Pareto

原因：

- 用户通常既需要看绝对排名，也需要看累计贡献占比。

输出形式：

- Top N 排名图，
- 累计贡献图，
- 原始值、排名、占比、累计占比表格。

### C. Selected Process Compare

目标：

- 对用户选定的多个 process，在一个 impact category 上做横向比较。

数据来源：

- `processes_one_impact`

主要承载位置：

- 同一个 `LCA Analysis` 页面中的 compare tab。

图表建议：

- 主图：分组 `Bar` 或 `Column`
- 可选基准卡片：`Bullet`

原因：

- 这是最适合业务筛选、内部 benchmark、候选方案对比的形式。

输出形式：

- 对比图，
- benchmark 概要，
- 可排序比较表。

### D. 小型 KPI 概要

目标：

- 在用户进入完整图表前，先快速给出当前视角的关键信息。

图表/组件建议：

- Ant Design `Statistic`

典型指标：

- 当前值，
- snapshot 名称/日期，
- 排名，
- 百分位，
- 与 benchmark 的差值。

## 5.2 二期：聚合分析

二期应在一期稳定之后再启动。

### A. Grouped Results

目标：

- 按地域、model、team、state、tag 等业务元数据聚合结果。

依赖：

- 除当前最小 `process_map` 之外，还需要更多 metadata 映射，
- query 侧要支持聚合接口。

图表建议：

- `Heatmap`：展示 `group x impact`
- `Treemap`：展示组内占比
- `Bar`：展示排序后的 group ranking

## 5.3 三期：路径分析与不确定性分析

这些能力应明确延后，不纳入第一版交付。

### A. Contribution Path Analysis

目标：

- 识别某一个 impact 的上游关键路径和主要分支。

依赖：

- 新的路径型后端接口，
- `solve_one(return_x/g/h=true)`，
- 图遍历和剪枝规则，
- impact/path 阈值控制。

图表建议：

- `Sankey`
- 树表
- 分支排名列表

### B. Uncertainty / Scenario Analysis

目标：

- 支持类似 Monte Carlo 的分布分析或 scenario 对比。

依赖：

- 支持不确定性的底层数据模型与计算链路，
- 明确的统计展示方式。

这部分不应纳入第一版前端分析功能。

## 6. 图表选型建议

以下是分析任务与 Ant Design Charts 2.6.7 组件的映射关系。

| 分析任务                  | 推荐图型   | 阶段     | 说明                                   |
| ------------------------- | ---------- | -------- | -------------------------------------- |
| 单 process 全 impacts     | `Bar`      | 一期     | 默认首选，长标签可读性最好。           |
| 单 process 归一化 profile | `Radar`    | 一期可选 | 必须先归一化，且 impact 数量不能太多。 |
| 单 impact 的 process 排名 | `Bar`      | 一期     | 最稳妥的 hotspot 图。                  |
| 单 impact 的累计占比      | `DualAxes` | 一期     | 适合做 Pareto：柱 + 累计折线。         |
| 选定 process 与基准对比   | `Bullet`   | 一期     | 很适合目标值/基线对比。                |
| 分组与 impact 的矩阵比较  | `Heatmap`  | 二期     | 依赖 grouped aggregation。             |
| 组内占比结构              | `Treemap`  | 二期     | 依赖 tags/grouping 元数据。            |
| 贡献路径                  | `Sankey`   | 三期     | 只有路径 API 具备后才适合使用。        |

早期阶段的主要限制：

- 不把 `Pie` 作为主分析图。
- 在没有路径数据前不引入 `Sankey`。
- 不在 `Radar` 中直接画多单位原始 LCIA 值。

## 7. 前端信息架构

## 7.1 强化现有 Process Detail Drawer

优先增强现有 process 详情中的 LCIA 区块，而不是另起一套页面替代。

建议结构：

1. 概要信息行
2. profile 图
3. 元数据行（`source`、`snapshot`、`result`、`computed_at`）
4. 原始值表格

这样可以最大程度保留当前 process-centric 工作流。

## 7.2 新增轻量级 LCA Analysis 页面

在 `tiangong-lca-next` 中新增一个紧凑型分析页面，至少包含一期两个 tab：

- `Hotspots`
- `Compare`

该页面不应做成大屏 dashboard，而应继续沿用现有 `PageContainer + Card + Table + Drawer` 的产品语言。

## 7.3 保持现有计算入口不变

当前 solve 流程和 task center 模式已经符合产品交互：

- 提交任务，
- 在 task center 跟踪，
- 结果完成后再查询和展示。

分析层应该复用这一模式，而不是再设计一套新的 job 交互模型。

## 8. 跨仓实施项

虽然本文档位于 `tiangong-lca-next`，但落地需要三个仓库协同。

## 8.1 `tiangong-lca-next`

一期任务：

- 新增分析 UI 面板和图表包装层，
- 确保图表与表格数据一致，
- 在需要的位置提供归一化开关，
- 支持当前分析数据的导出，
- 支持 light/dark 主题下的图表渲染，
- 为数据转换和渲染状态补单测。

## 8.2 `tiangong-lca-edge-functions`

一期任务：

- 强化 `lca_query_results`，支撑 ranking 和 compare 场景，
- 为 hotspot 场景补排序、分页和可选 `top_n`，
- 保持 `source/snapshot_id/result_id/meta` 返回结构稳定。

二期任务：

- 新增 grouped aggregation 接口，

三期任务：

- 新增 contribution path 查询接口。

## 8.3 `tiangong-lca-calculator`

一期状态：

- 现有 solver/query artifact 已经足够支撑 profile、hotspot、compare。

二期任务：

- 暴露更丰富的 metadata mapping，以支持 grouped analysis。

三期任务：

- 支撑路径型分析输入输出，
- 为未来的不确定性/scenario 分析提供底座。

## 9. 实施顺序

建议顺序如下：

1. 先在现有 process LCIA 区块上补一期 profile 可视化。
2. 再新增 hotspot 排名页或 tab，并以最小边界补齐 edge 查询能力。
3. 再新增 selected process compare 视图。
4. 最后补格式化、导出、空态、错误态和 dark mode 收尾。
5. 一期跑稳后再进入 grouped analysis。
6. Sankey 与 uncertainty 明确后置。

## 10. 验收标准

一期完成的标准：

- 单个 process 能以“图 + 表”的形式展示全部 impacts；
- 某一个 impact 能展示多 process 的 hotspot 排名；
- 用户可在一个 impact 下对多个 process 做比较；
- 每个分析视图都展示 `snapshot_id`、`result_id`、`source`、`computed_at`；
- 图表数值与表格数值一致；
- 空态、加载态、错误态符合现有产品习惯；
- 图表在 light/dark 主题下表现正常。

## 11. 风险与待确认项

## 11.1 依赖批准

图表依赖的最终选型与安装，仍需在该仓库中获得明确批准。

## 11.2 Grouped analysis 元数据不足

当前 snapshot mapping 足以做 process 级直接分析，但还不足以做丰富的 grouped reporting。

## 11.3 归一化展示的认知风险

用户必须清楚当前看到的是：

- 原始值，
- 原始值排名，
- 归一化 category profile，
- 分组后的聚合值。

UI 必须明确标注这些语义。

## 11.4 范围失控风险

最大的交付风险，是试图一次性把以下内容全部上线：

- dashboard，
- grouped analysis，
- Sankey，
- uncertainty。

本方案的默认上线策略应保持收敛：

- 先做排序与比较，
- 再做聚合，
- 最后做路径与不确定性。
