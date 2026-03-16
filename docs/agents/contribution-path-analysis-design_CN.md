# Contribution Path Analysis 设计方案

更新时间：2026-03-13

## 1. 目标

为 `某一个 process + 某一个 impact` 提供可解释的上游贡献路径分析，回答三个问题：

1. 该过程在该 impact 下的总结果是多少。
2. 哪些上游过程是主要贡献者。
3. 从根过程向上游展开时，应该优先看哪些供应链分支。

本设计面向当前三仓架构：

- `tiangong-lca-calculator`
- `tiangong-lca-edge-functions`
- `tiangong-lca-next`

## 2. 非目标

第一版明确不做以下能力：

- 跨快照分析
- Monte Carlo / 不确定性分析
- 多 process 同时做路径分析
- 审计级的“完整精确 Sankey 边权分解”
- 任意阈值滑杆下的纯前端即时重算

第一版的重点是：先把一个稳定、可解释、可交付的路径分析链路打通。

## 3. 现状与约束

当前数值底座是够的，但查询与展示链路还不够。

### 3.1 已有能力

- `solve_one` 已支持 `return_x / return_g / return_h`。
- snapshot artifact 中已有 `A / B / C` 稀疏矩阵数据。
- worker 已有稳定的异步 job 处理、结果持久化、`lca_result_cache` 去重缓存机制。

### 3.2 当前缺口

- `solve_all_unit` 的 query sidecar 只有 `h_matrix`，只适合热点和对比，不适合路径分析。
- `lca_query_results` 当前只会做同步结果切片，不适合承载路径遍历这种慢分析。
- edge function 当前只处理 JSON artifact，不适合去解 `solve_one` 的 HDF5 结果。
- `snapshot-index-v1` 的 `process_map` 只有 `process_id / process_index / process_version`，缺少路径分析展示所需的名称与业务 metadata。

结论：Contribution Path Analysis 不能作为 `query-results` 的一个小扩展来做，需要一条新的分析链路。

## 4. 设计原则

### 4.1 路径计算尽量靠近 solver 数据

不要让 edge function 去解 HDF5，也不要让前端拿稀疏矩阵自己拼路径。

路径分析应尽量在 `solver-worker` 内完成，因为它已经能：

- 拉取 snapshot artifact
- 读取 `A / B / C`
- 运行 `solve_one`
- 写入 `lca_results`

### 4.2 第一版输出“可查询的分析结果”，不是“底层原始矩阵”

前端真正需要的是：

- 总 impact
- 主要贡献过程
- 上游分支排序
- 可展开的节点与关系

前端不需要：

- 原始 `x / g / h` 全量向量
- 稀疏矩阵 triplets
- HDF5 artifact 解码逻辑

### 4.3 第一版优先保证“节点贡献精确”，路径排序允许是探索式语义

路径分析最容易出问题的不是求解，而是“路径归因”。

第一版建议明确区分两类量：

- **精确量**
  - 根过程该 impact 的总结果
  - 每个过程在该功能单位下的 direct characterized contribution
- **探索量**
  - 路径优先级
  - 分支排序
  - 展开顺序

也就是说，第一版先做 **importance-first contribution graph**，而不是承诺“完整、精确、可审计的 Sankey 边权分解”。

## 5. 推荐方案

推荐新增一条专用异步分析链路，而不是继续堆到 `lca_query_results` 上。

### 5.1 总体结构

```text
Next Analysis Page
  -> Edge: lca_contribution_path
    -> DB: lca_jobs + lca_result_cache
      -> Worker: analyze_contribution_path
        -> snapshot artifact + solve_one(x/g/h)
        -> path traversal
        -> result artifact: contribution-path:v1 (JSON)
  -> Edge: lca_contribution_path_result
    -> 返回解析后的 JSON 结果
```

### 5.2 为什么不建议走 `query-results + solve-one-query:v1`

可以做，但不是第一推荐：

- edge 仍要承担大量路径语义与图遍历逻辑。
- 后续 cycle 处理、cutoff、max_depth、top_k_children 都会堆在 TypeScript 侧。
- query 侧会从“轻量切片服务”变成“路径分析引擎”，职责会越来越乱。

因此推荐把“路径分析计算”放在 worker，把 edge 保持为：

- 参数校验
- 快照解析
- job 去重
- 结果返回

## 6. 第一版语义定义

### 6.1 分析对象

输入固定为：

- `process_id`
- `impact_id`
- `amount`，默认 `1.0`
- `data_scope`，用于选 snapshot

### 6.2 第一版返回的核心对象

第一版建议返回三类结果。

#### A. Summary

- 总 impact 值
- amount
- 根过程名称
- impact 名称与单位
- 展开节点数
- 截断节点数
- 覆盖率

#### B. Process Contributions

这是第一版最重要的“精确结果”。

每个过程只出现一次，字段建议包含：

- `process_id`
- `process_index`
- `label`
- `location`
- `direct_impact`
- `share_of_total`
- `is_root`
- `depth_min`

这里的 `direct_impact` 指该过程在所求功能单位下、目标 impact 上的 **direct characterized contribution**。

#### C. Branches / Traversal

这是第一版的“探索结果”。

字段建议包含：

- `rank`
- `path_process_ids`
- `path_labels`
- `path_score`
- `terminal_reason`
  - `cutoff`
  - `max_depth`
  - `max_nodes`
  - `cycle_cut`
  - `leaf`

### 6.3 第一版不承诺的语义

以下能力应明确延后：

- 精确 edge-level impact allocation
- 精确 Sankey 宽度
- 同一过程在不同分支实例上的精确拆分值

这是第一版最重要的边界，必须在文档和 API 描述里写清楚。

## 7. 三仓改造方案

## 7.1 `tiangong-lca-calculator`

### A. 新增 job type

建议新增：

- `analyze_contribution_path`

payload 建议：

```json
{
  "type": "analyze_contribution_path",
  "job_id": "<uuid>",
  "snapshot_id": "<uuid>",
  "process_id": "<uuid>",
  "process_index": 123,
  "impact_id": "<uuid>",
  "impact_index": 7,
  "amount": 1.0,
  "options": {
    "max_depth": 4,
    "top_k_children": 5,
    "cutoff_share": 0.01,
    "max_nodes": 200
  }
}
```

说明：

- `process_index` 与 `impact_index` 由 edge 在入队前解析，worker 不必再次查业务映射。
- 同时保留 `process_id / impact_id`，便于 artifact 可追溯和调试。

### B. 新增 artifact format

建议新增：

- `contribution-path:v1`

格式建议为 JSON，而不是 HDF5。原因：

- 这是“分析结果”，不是底层数值矩阵。
- edge 与前端都更适合直接读取 JSON。
- 结果结构天然是树/图/列表，不是规则矩阵。

### C. worker 计算步骤

`analyze_contribution_path` 在 worker 中的执行顺序建议如下：

1. `ensure_prepared(snapshot_id)`
2. 构造单过程 demand vector
3. 运行 `solve_one(return_x=true, return_g=true, return_h=true)`
4. 从 snapshot artifact 读取 `A / B / C`
5. 对目标 `impact_index` 计算每个过程的 direct characterized intensity
6. 基于 `x` 计算每个过程的 exact direct contribution
7. 从根过程开始做 importance-first upstream traversal
8. 应用 `max_depth / top_k_children / cutoff_share / max_nodes`
9. 生成 `summary + process_contributions + branches + links`
10. 持久化 `contribution-path:v1` 结果到 `lca_results`

### D. 推荐增加 snapshot metadata

建议扩展 `snapshot-index-v1` 或新增分析 sidecar，至少补齐：

- `process_name`
- `location`
- `process_type`
- `team_id`

其中：

- `process_name` 对路径分析是必须项
- 其他字段可同时服务二期 grouped results

推荐做法：

- 对 `process_map` 增加可选字段，保持旧 reader 向后兼容

## 7.2 `tiangong-lca-edge-functions`

### A. 新增提交接口

建议新增：

- `POST /lca/contribution-path`

请求体建议：

```json
{
  "scope": "prod",
  "snapshot_id": "optional-uuid",
  "data_scope": "current_user",
  "process_id": "<uuid>",
  "impact_id": "<uuid>",
  "amount": 1.0,
  "options": {
    "max_depth": 4,
    "top_k_children": 5,
    "cutoff_share": 0.01,
    "max_nodes": 200
  }
}
```

返回体建议复用现有异步模式：

- `queued`
- `in_progress`
- `cache_hit`

### B. 新增结果读取接口

建议新增：

- `GET /lca/contribution-path/result?result_id=<uuid>`

职责：

- 校验结果归属
- 拉取 JSON artifact
- 返回解析后的 `contribution-path:v1`

不要让前端自己直连 object store 解读 artifact。

### C. 复用现有缓存机制

建议直接复用：

- `lca_jobs`
- `lca_result_cache`
- `lca_results`

请求去重 key 建议包含：

- `snapshot_id`
- `process_id`
- `impact_id`
- `amount`
- `max_depth`
- `top_k_children`
- `cutoff_share`
- `max_nodes`

## 7.3 `tiangong-lca-next`

### A. 页面位置

不新增左侧导航项。

入口继续放在现有：

- `mydata/processes`
- 独立分析页 `/mydata/processes/analysis`

路径分析可以作为分析页中的一个新 tab：

- `Contribution Path`

### B. 第一版 UI

第一版不做 Sankey，先做三块：

1. 参数区
   - data scope
   - process
   - impact method
   - amount
   - max depth
   - top k children
   - cutoff
2. 结果概要
   - total impact
   - coverage
   - expanded nodes
   - truncated nodes
   - snapshot / result / computed_at
3. 结果展示
   - `Top upstream contributors` 表格
   - `Branch ranking` 表格
   - `Expandable relation table` 或 `Collapse` 结构

全部复用现有 Ant Design 组件，不自己重写样式：

- `Card`
- `Form`
- `InputNumber`
- `Descriptions`
- `Statistic`
- `Table`
- `Collapse`
- `Tag`

### C. 为什么第一版不直接做 Sankey

因为第一版还没有精确 edge-level impact allocation 语义。

如果强行先做 Sankey，会出现两个问题：

1. 图看起来“像”是精确分流，但其实只是启发式路径分数。
2. 用户会自然追问“为什么边宽之和与总 impact 对不上”。

因此 Sankey 应放到第二版，在 edge attribution 语义稳定后再上。

## 8. 建议的结果结构

`contribution-path:v1` 建议结构：

```json
{
  "version": 1,
  "format": "contribution-path:v1",
  "snapshot_id": "<uuid>",
  "job_id": "<uuid>",
  "process_id": "<uuid>",
  "impact_id": "<uuid>",
  "amount": 1.0,
  "options": {
    "max_depth": 4,
    "top_k_children": 5,
    "cutoff_share": 0.01,
    "max_nodes": 200
  },
  "summary": {
    "total_impact": 12.34,
    "unit": "kg CO2-eq",
    "coverage_ratio": 0.91,
    "expanded_node_count": 27,
    "truncated_node_count": 18,
    "computed_at": "2026-03-13T00:00:00Z"
  },
  "root": {
    "process_id": "<uuid>",
    "label": "Example process"
  },
  "impact": {
    "impact_id": "<uuid>",
    "label": "Global warming potential",
    "unit": "kg CO2-eq"
  },
  "process_contributions": [
    {
      "process_id": "<uuid>",
      "process_index": 123,
      "label": "Provider A",
      "location": "CN",
      "direct_impact": 4.56,
      "share_of_total": 0.37,
      "is_root": false,
      "depth_min": 2
    }
  ],
  "branches": [
    {
      "rank": 1,
      "path_process_ids": ["<uuid-root>", "<uuid-a>", "<uuid-b>"],
      "path_labels": ["Root", "Provider A", "Provider B"],
      "path_score": 3.21,
      "terminal_reason": "cutoff"
    }
  ],
  "links": [
    {
      "source_process_id": "<uuid-root>",
      "target_process_id": "<uuid-a>",
      "depth_from_root": 1,
      "cycle_cut": false
    }
  ],
  "meta": {
    "source": "solve_one_path_analysis",
    "snapshot_index_version": 1
  }
}
```

## 9. 遍历算法建议

### 9.1 精确部分

精确部分建议只承诺到“过程 direct contribution”：

1. 用 `solve_one` 得到根过程 demand 下的 `x`
2. 取目标 impact 的 `C` 行
3. 与 `B` 组合得到每个过程的 characterized direct intensity
4. 用 `x` 乘上 intensity，得到每个过程的 exact direct contribution

这个量与总 impact 是一致的，适合作为第一版的稳定真值。

### 9.2 遍历部分

遍历建议做 importance-first upstream traversal：

1. 从 root process 出发
2. 根据 technosphere adjacency 找 provider
3. 用启发式 score 给 child 排序
4. 按 `top_k_children` 展开
5. 命中 `cutoff / max_depth / max_nodes / cycle` 时停止

推荐的 child score：

- 优先使用 `abs(direct_contribution_of_child)`
- 后续如果需要更强的 branch 语义，再引入 branch-specific activity weighting

### 9.3 cycle 处理

遇到祖先链中已经出现过的 process 时：

- 记录一条 `cycle_cut` link
- 停止继续向下展开
- 不尝试在第一版里做 cycle reallocation

## 10. 主要风险

### 10.1 语义风险

如果第一版一开始就承诺“精确路径分解”，后面极容易陷入：

- shared upstream 节点重复计数
- cycle 网络如何切分
- edge 宽度为什么与总 impact 不完全一致

因此第一版必须明确：

- 精确值在 `process_contributions`
- `branches` 是探索与排序结果

### 10.2 metadata 风险

如果 snapshot index 仍只有 UUID，前端做出来会很难用。

因此建议在做路径分析前，先把最基本的：

- `process_name`
- `location`

补进 snapshot metadata。

### 10.3 性能风险

路径分析是按需慢查询，不能假设像 `query-results` 一样毫秒级返回。

因此第一版必须：

- 走异步 job
- 做请求去重
- 做结果缓存

## 11. 推荐实施顺序

### M1. 后端打底

- `calculator`
  - 新增 `analyze_contribution_path` job
  - 新增 `contribution-path:v1` artifact
  - 扩展 snapshot metadata
- `edge-functions`
  - 新增 `lca_contribution_path`
  - 新增 `lca_contribution_path_result`

### M2. 前端首版

- 新增 `Contribution Path` tab
- 参数表单
- summary cards
- upstream contributors table
- branch ranking table

### M3. 二版增强

- 更细的 branch score
- 可视化关系图
- Sankey

## 12. 一句话结论

这个需求可以做，而且是下一步合理的方向；真正的难点不在 solver，而在“路径语义”和“哪一层来做路径计算”。

最稳妥的方案是：

- **worker 负责算**
- **edge 负责排队和取结果**
- **前端第一版先做表格化路径分析，不先做 Sankey**
