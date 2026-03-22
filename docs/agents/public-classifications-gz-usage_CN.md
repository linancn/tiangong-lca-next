# `public/classifications` 下 `.gz` 数据使用说明

## 结论先看

`public/classifications` 下面一共有 8 个 `.gz` 文件，它们在应用里分成两层使用：

1. 预缓存层  
   应用壳加载后，`ClassificationCacheMonitor` 会把这 8 个文件全部加入预缓存流程，3 秒后按 2 个一批拉取、解压并写入 IndexedDB。对应代码见 `src/app.tsx:104-107`、`src/components/ClassificationCacheMonitor/index.tsx:10-42`、`src/components/CacheMonitor/useResourceCacheMonitor.ts:44-126`。

2. 业务读取层  
   真正页面/服务使用时，不会直接读 `.gz`，而是通过 `src/services/classifications/util.ts` 先从 IndexedDB 取；如果还没缓存，再即时 `fetch('/classifications/<filename>')`、解压、写回缓存。对应代码见 `src/services/classifications/util.ts:117-164`。

也就是说：

- 启动后，这 8 个文件会尽量都被预热缓存。
- 真正“哪一个文件会被业务用到”，由 `src/services/classifications/api.ts` 根据 `categoryType`、`lang`、以及 `Flow` 是否为 `Elementary flow` 决定。

## 总映射表

| 文件 | 何时使用 | 实际承载的数据 |
| --- | --- | --- |
| `CPCClassification.min.json.gz` | 请求 `getILCDClassification('Flow', 'en', ...)` 时 | 普通 `Flow` 分类英文树 |
| `CPCClassification_zh.min.json.gz` | 请求 `getILCDClassification('Flow', 'zh', ...)` 时 | 普通 `Flow` 分类中文标签树 |
| `ISICClassification.min.json.gz` | 请求 `getILCDClassification('Process'/'LifeCycleModel', 'en', ...)` 时 | `Process` / `LifeCycleModel` 分类英文树 |
| `ISICClassification_zh.min.json.gz` | 请求 `getILCDClassification('Process'/'LifeCycleModel', 'zh', ...)` 时 | `Process` / `LifeCycleModel` 分类中文标签树 |
| `ILCDClassification.min.json.gz` | 请求 `Contact` / `Source` / `UnitGroup` / `FlowProperty` 的英文分类时 | 通用 ILCD 分类英文树，按 `@dataType` 分组 |
| `ILCDClassification_zh.min.json.gz` | 请求上述对象的中文分类时 | 通用 ILCD 分类中文标签树，按 `@dataType` 分组 |
| `ILCDFlowCategorization.min.json.gz` | `Flow` 且 `flowType === 'Elementary flow'` 时 | Elementary flow 分类英文树 |
| `ILCDFlowCategorization_zh.min.json.gz` | `Flow` 且 `flowType === 'Elementary flow'` 且中文时 | Elementary flow 分类中文标签树 |

核心判断逻辑都在 `src/services/classifications/api.ts`：

- 文件名常量：`29-47`
- `Flow` / `Process` / `LifeCycleModel` 的特殊数据源判断：`177-196`
- 通用分类读取：`205-254`
- Elementary flow 分类读取：`256-285`
- Flow 页面同时取普通分类与 elementary flow 分类：`287-298`

## 各类文件的具体使用场景

### 1. `CPCClassification*.gz`

这组文件只在 `categoryType === 'Flow'` 时使用。  
代码在 `src/services/classifications/api.ts:177-185`，这里把 `Flow` 映射到了 `CPCClassification*.gz`，而不是 `ILCDClassification*.gz`。

#### 什么时候会用到

- Flow 表单里的分类选择器，且 `flowType` 不是 `Elementary flow` 时  
  `src/components/LevelTextItem/form.tsx:137-148`
- Flow 详情里的分类路径展示，且 `flowType` 不是 `Elementary flow` 时  
  `src/components/LevelTextItem/description.tsx:21-29`
- Flows 列表页加载分类筛选项时，会取普通 Flow 分类，最终放在 `category`  
  `src/services/classifications/cache.ts:56-85`  
  `src/pages/Flows/index.tsx:346-366`
- Flow 数据列表/详情转中文分类名时，普通 Flow 会从 `category` 分支取值  
  `src/services/flows/api.ts:325-348`  
  `src/services/general/api.ts:1187-1205`

#### 使用结果

- 英文场景只用英文文件。
- 中文场景会先以英文树为主，再用中文文件按同一个 `@id` 覆盖显示标签。对应 `src/services/classifications/api.ts:211-240`。

### 2. `ILCDFlowCategorization*.gz`

这组文件只服务于 `Elementary flow`，不会用于普通 `Flow`。

#### 什么时候会用到

- Flow 表单中，当 `dataType === 'Flow'` 且 `flowType === 'Elementary flow'` 时  
  `src/components/LevelTextItem/form.tsx:140-145`
- Flow 详情中，当 `categoryType === 'Flow'` 且 `flowType === 'Elementary flow'` 时  
  `src/components/LevelTextItem/description.tsx:21-24`
- Flows 列表页初始化分类筛选项时，会把 elementary flow 分类放到 `categoryElementaryFlow`，并拼成 `elementary:<id>` 的筛选值  
  `src/services/classifications/api.ts:287-295`  
  `src/pages/Flows/index.tsx:350-366`
- Flow 列表/详情转中文分类名时，如果 `typeOfDataSet === 'Elementary flow'`，会走 `categoryElementaryFlow` 分支  
  `src/services/flows/api.ts:333-348`  
  `src/services/general/api.ts:1192-1205`

#### 使用结果

- 普通 Flow 不会命中这组文件。
- 只有 elementary flow 才会命中。

### 3. `ISICClassification*.gz`

这组文件由 `getSpecialClassificationSource()` 专门处理，给 `Process` 和 `LifeCycleModel` 共用。  
代码见 `src/services/classifications/api.ts:188-193`。

#### 什么时候会用到

- Process 列表、搜索结果、详情等中文分类映射  
  `src/services/processes/api.ts:65-80`  
  `src/services/processes/api.ts:503-520`  
  `src/services/processes/api.ts:758-780`  
  `src/services/processes/api.ts:1148-1169`  
  `src/services/general/api.ts:1292-1312`
- Life cycle model 列表、详情等分类映射  
  `src/services/lifeCycleModels/api.ts:477`  
  `src/services/lifeCycleModels/api.ts:591`  
  `src/services/lifeCycleModels/api.ts:706`  
  `src/services/general/api.ts:1362-1366`
- 表单/详情中的通用分类组件，如果传入的 `categoryType` 是 `Process` 或 `LifeCycleModel`  
  `src/components/LevelTextItem/form.tsx:146`  
  `src/components/LevelTextItem/description.tsx:27`

#### 使用结果

- `Process` 和 `LifeCycleModel` 不会去读 `ILCDClassification*.gz`，而是直接读 `ISICClassification*.gz`。
- `LifeCycleModel` 在代码里共用的是 `dataType: 'Process'` 的分类树，见 `src/services/classifications/api.ts:188-192`。

### 4. `ILCDClassification*.gz`

这是通用 ILCD 分类文件，按 `@dataType` 分组读取。  
读取逻辑在 `src/services/classifications/api.ts:159-175`、`198-203`。

目前实际命中的对象主要有：

- `Contact`
- `Source`
- `UnitGroup`
- `FlowProperty`

#### 什么时候会用到

- Contact 列表/详情分类展示  
  `src/services/contacts/api.ts:197`  
  `src/services/contacts/api.ts:287`  
  `src/services/contacts/api.ts:365`  
  `src/services/general/api.ts:982-993`
- Source 列表/详情分类展示  
  `src/services/sources/api.ts:195`  
  `src/services/sources/api.ts:308`  
  `src/services/sources/api.ts:416`  
  `src/services/general/api.ts:1010-1015`
- UnitGroup 列表/详情分类展示  
  `src/services/unitgroups/api.ts:198`  
  `src/services/unitgroups/api.ts:322`  
  `src/services/unitgroups/api.ts:445`  
  `src/services/general/api.ts:1062-1077`
- FlowProperty 列表/详情分类展示  
  `src/services/flowproperties/api.ts:200`  
  `src/services/flowproperties/api.ts:316`  
  `src/services/flowproperties/api.ts:451`  
  `src/services/general/api.ts:1125-1129`
- 通用分类选择器/描述组件里，只要传入的是以上 `categoryType`，也会走这组文件  
  `src/components/LevelTextItem/form.tsx:146`  
  `src/components/LevelTextItem/description.tsx:27`

#### 使用结果

- 英文时只读 `ILCDClassification.min.json.gz`。
- 中文时会再读 `ILCDClassification_zh.min.json.gz`，并根据 `categoryTypeOptions` 把英文类型名映射成中文类型名后查同组数据。对应 `src/services/classifications/api.ts:221-238`。

## “什么时候会读全部树，什么时候只读局部”

代码里有两类典型调用方式：

### 1. `['all']`

表示取整棵分类树，常用于：

- 表单下拉/级联选择器
- 列表页分类展示
- Flow 页分类筛选项初始化
- 中文标签映射缓存

典型位置：

- `src/components/LevelTextItem/form.tsx:143-146`
- `src/services/classifications/cache.ts:73-80`
- `src/pages/Flows/index.tsx:350`

### 2. `[某个 id]`

表示只取匹配该 id 的那条分类路径，常用于详情展示某个已选分类。  
典型位置：

- `src/components/LevelTextItem/description.tsx:21-29`

底层过滤逻辑见：

- 普通分类：`src/services/classifications/api.ts:108-145`
- Elementary flow 分类：`src/services/classifications/api.ts:73-106`

## 缓存与实际读取顺序

完整顺序如下：

1. 应用壳挂载 `ClassificationCacheMonitor`。  
   `src/app.tsx:104-107`
2. 3 秒后启动预缓存；如果 manifest 版本、文件列表一致，且 24 小时内未过期，并且 IndexedDB 里 8 个文件都在，就不会重复拉取。  
   `src/components/CacheMonitor/useResourceCacheMonitor.ts:44-77`
3. 如果需要重建缓存，则按批次调用 `cacheAndDecompressClassificationFile()`，从 `/classifications/<filename>` 拉取 `.gz`，解压后写入 IndexedDB。  
   `src/components/CacheMonitor/useResourceCacheMonitor.ts:80-118`  
   `src/services/classifications/util.ts:128-143`
4. 真正业务调用 `getILCDClassification()` / `getILCDFlowCategorization()` 时，优先从 IndexedDB 取；没有的话再即时补抓。  
   `src/services/classifications/util.ts:150-163`
5. 再往上还有一层内存缓存，避免同一会话里反复解析同一分类树。  
   `src/services/classifications/cache.ts:29-53`  
   `src/services/classifications/cache.ts:56-85`

## 当前代码里一个值得注意的点

`categoryTypeOptions` 里定义了 `LCIAMethod`，见 `src/services/classifications/util.ts:25-53`；  
但当前代码搜索结果里，没有实际的 `getILCDClassification('LCIAMethod', ...)` 调用。

这表示：

- `ILCDClassification*.gz` 理论上可以承载 `LCIAMethod` 分类；
- 但以当前代码为准，`public/classifications` 里的 `.gz` 还没有被 LCIA method 分类界面真正消费到。

## 一句话总结

- 普通 `Flow` 看 `CPCClassification*.gz`
- `Elementary flow` 看 `ILCDFlowCategorization*.gz`
- `Process` / `LifeCycleModel` 看 `ISICClassification*.gz`
- `Contact` / `Source` / `UnitGroup` / `FlowProperty` 看 `ILCDClassification*.gz`
- 中文展示时，都会额外配对读取对应的 `_zh` 文件来覆盖标签
- 应用启动后会尽量把 8 个 `.gz` 全部预缓存，但真正业务命中哪一个，取决于当前对象类型、语言和 `Flow` 的 `flowType`
