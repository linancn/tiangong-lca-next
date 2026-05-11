# 本文档描述生命周期模型全文搜索期望的结果

> `rule_verification` 不由夹具 payload 直接传入，而是在保存时根据 `json_ordered` 校验结果写入数据库。

1. 数据库可根据id查询到用于全文搜索的生命周期模型数据（`create.summary.rowExists` 等于 `true`）
2. PGroonga 全文搜索结果包含运行时生命周期模型`id`（`fullTextSearch.pgroongaContainsRuntimeId` 等于 `true`）
