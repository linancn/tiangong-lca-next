# view source

> `rule_verification` 不由夹具 payload 直接传入，而是在保存时根据 `json_ordered` 校验结果写入数据库。

1. 数据库可根据id查询到刚创建的生命周期模型数据（`create.summary.rowExists` 等于 `true`）
2. 调用生命周期模型详情查询成功并保留源模型数据（`viewSource.record.json_tg.detailSuccess` 等于 `true`）

# copy

3. 数据库可根据复制后的新`id`查询到复制后的生命周期模型数据（`copy.summary.rowExists` 等于 `true`）
4. 复制后的`id`和运行时复制模型`id`一致（`copy.record.id` 等于 `runtimeCopyModelId`）
5. 复制后的`version`和运行时生命周期模型版本一致（`copy.record.version` 等于 `runtimeVersion`）
6. 复制后的`user_id`和当前用户`id`一致（`copy.record.user_id` 等于 `currentUserId`）
7. 复制后的主产品子模型`id`和复制后的模型`id`一致（`copy.summary.primarySubmodelId` 等于 `runtimeCopyModelId`）
