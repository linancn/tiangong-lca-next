# contribute

> `rule_verification` 不由夹具 payload 直接传入，而是在保存时根据 `json_ordered` 校验结果写入数据库。

1. 贡献前数据库可根据id查询到刚创建的生命周期模型数据（`create.summary.rowExists` 等于 `true`）
2. 数据库可根据相同`id`和`version`查询到贡献后的生命周期模型数据（`contribute.summary.rowExists` 等于 `true`）
3. 贡献后的`id`和运行时生命周期模型`id`一致（`contribute.record.id` 等于 `runtimeModelId`）
4. 贡献后的`version`和运行时生命周期模型版本一致（`contribute.record.version` 等于 `runtimeVersion`）
5. 贡献后的`state_code`为0（`contribute.record.state_code` 等于 `0`）
6. 贡献后的主产品子模型`id`和运行时生命周期模型`id`一致（`contribute.summary.primarySubmodelId` 等于 `runtimeModelId`）
