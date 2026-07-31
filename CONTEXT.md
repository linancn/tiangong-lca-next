# TianGong LCA Data Platform

This context defines the domain language used for LCA data authoring and its user-facing guidance in TianGong.

## Dataset objects

**Process dataset / 过程数据集**: The core LCA data-authoring object. It records an activity's process information, modelling and validation, administrative information, and input/output exchanges.

**Life cycle model / 生命周期模型**: A data object independent of process datasets that connects processes visually into a system. A process dataset can be checked and submitted for review without creating a model.

**Partly terminated system / 部分终止系统**: A modeled system in which some inputs or outputs remain unlinked to providing or receiving processes.

**Foreground system / 前景系统**: The processes modeled directly for the study, typically those under the study owner's control or influence. It is not synonymous with a partly terminated system; a foreground system may be fully or partly linked.

**Flow / 流**: An object referenced by process inputs and outputs. TianGong distinguishes product flows, waste flows, and elementary flows (`基础流` in the Chinese UI).

**Reference flow / 基准流**: The exchange used as the quantitative reference of a process dataset. _Avoid_: `参考流` when referring to the process quantitative reference.

**Reference node / 参考节点**: The process node selected as the reference of a life cycle model. _Avoid_: `基准过程` or `基准节点` in user-facing platform instructions.

**Target amount / 目标数量**: The amount assigned to the reference node when solving or viewing a life cycle model. _Avoid_: `基准流量` in user-facing platform instructions.

## Authoring workflow

**Data Check / 数据校验**: The platform action that checks required fields, referenced objects, and other dataset constraints before review. _Avoid_: English `Data Check`, `数据检查`, or `数据验证` in Chinese user-facing instructions.

**Submit for Review / 提交审核**: The platform action that sends a saved dataset into the review workflow after it passes data validation. _Avoid_: English `Submit for Review` in Chinese user-facing instructions.

**My Data / 我的数据**: The workspace where users create and manage contacts, sources, unit groups, flow properties, flows, processes, and models.
