# 本文档描述生命周期模型数据校验成功期望的结果

> `rule_verification` 不由夹具 payload 直接传入，而是在保存时根据 `json_ordered` 校验结果写入数据库。

1. 创建阶段数据库可根据id查询到刚创建的生命周期模型数据（`create.summary.rowExists` 等于 `true`）
2. 数据库可根据id查询到已更新的生命周期模型数据（`checkData.summary.rowExists` 等于 `true`）
3. `id`和运行时生命周期模型`id`一致（`checkData.record.id` 等于 `runtimeModelId`）
4. `version`和运行时生命周期模型版本一致（`checkData.record.version` 等于 `runtimeVersion`）
5. `user_id`和当前用户`id`一致（`checkData.record.user_id` 等于 `currentUserId`）
6. `state_code`为0（`checkData.record.state_code` 等于 `0`）
7. `json_tg.xflow.nodes`中包含1个模型节点（`checkData.summary.nodesCount` 等于 `1`）
8. 主产品子模型`id`和运行时生命周期模型`id`一致（`checkData.summary.primarySubmodelId` 等于 `runtimeModelId`）
