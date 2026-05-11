# 本文档描述生命周期模型数据创建期望的结果

> `rule_verification` 不由夹具 payload 直接传入，而是在保存时根据 `json_ordered` 校验结果写入数据库。

1. 数据库可根据id查询到刚创建的生命周期模型数据（`create.summary.rowExists` 等于 `true`）
2. `id`和运行时生命周期模型`id`一致（`create.record.id` 等于 `runtimeModelId`）
3. `version`和运行时生命周期模型版本一致（`create.record.version` 等于 `runtimeVersion`）
4. `user_id`和当前用户`id`一致（`create.record.user_id` 等于 `currentUserId`）
5. `state_code`为0（`create.record.state_code` 等于 `0`）
6. `team_id`为`NULL`（`create.record.team_id` 等于 `null`）
7. `json_tg.xflow.nodes`中包含1个模型节点（`create.summary.nodesCount` 等于 `1`）
8. 主产品子模型`id`和运行时生命周期模型`id`一致（`create.summary.primarySubmodelId` 等于 `runtimeModelId`）
