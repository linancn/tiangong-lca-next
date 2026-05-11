# create

> `rule_verification` 不由夹具 payload 直接传入，而是在保存时根据 `json_ordered` 校验结果写入数据库。

1. 数据库可根据id查询到刚创建的生命周期模型数据（`create.summary.rowExists` 等于 `true`）

# create version

2. 数据库可根据相同`id`和新`version`查询到新增版本生命周期模型数据（`createVersion.summary.rowExists` 等于 `true`）
3. 新增版本的`id`和运行时生命周期模型`id`一致（`createVersion.record.id` 等于 `runtimeModelId`）
4. 新增版本的`version`为`01.01.001`（`createVersion.record.version` 等于 `01.01.001`）

# update reference

5. 数据库可根据相同`id`和新`version`查询到更新引用后的生命周期模型数据（`updateReference.summary.rowExists` 等于 `true`）
6. 更新引用后的`id`和运行时生命周期模型`id`一致（`updateReference.record.id` 等于 `runtimeModelId`）
7. 更新引用后的`version`仍为`01.01.001`（`updateReference.record.version` 等于 `01.01.001`）
8. 更新引用后的主产品子模型`id`和运行时生命周期模型`id`一致（`updateReference.summary.primarySubmodelId` 等于 `runtimeModelId`）
