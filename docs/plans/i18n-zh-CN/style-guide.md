---
title: Simplified Chinese locale style guide
docType: reference
scope: repository
status: active
authoritative: true
owner: tiangong-lca-next
language: zh
whenToUse:
  - when adding or correcting zh-CN product copy
whenToUpdate:
  - when Simplified Chinese product terminology or locale conventions change
checkPaths:
  - src/locales/zh-CN.ts
  - src/locales/zh-CN/**
  - docs/plans/i18n-zh-CN/glossary.json
lastReviewedAt: 2026-07-18
---

# 简体中文语言风格指南

使用清晰、简洁、专业的简体中文，按钮准确表达动作，错误和校验信息同时说明问题与可执行的恢复方式。规范语言标识为 `zh-CN`，其他中文别名仅通过类型化语言注册表归一化。

TianGong、TIDAS、eILCD、ILCD、模式字段、标识符、哈希、MIME 类型、文件名、单位、URL、ICU 占位符和代码标记保持不变。根据项目术语表和实际调用场景区分过程、流、流属性、交换、数据集、生命周期模型、审查、校验与合规。

界面语言、内容读取与编辑语言、服务查询语言、分类和地区参考资源是相互独立的能力。新增语言时应扩展注册表和能力矩阵，不得在页面或服务中新增散落的语言分支。
