# 本文档描述过程数据编辑后校验失败期望的结果

1. 数据库可根据id查询到已更新的数据
2. `json_ordered`字段和第三阶段上传的`jsonOrdered`一致
3. `user_id`和当前用户`id`一致
4. `state_code`为0
5. `version`为`01.01.000`
6. `team_id`为`NULL`
7. `rule_verification`为`FALSE`
8. `reviews`为`NULL`
9. `validateDatasetRuleVerification.datasetSdkValid`为`FALSE`
10. `validateDatasetRuleVerification.unRuleVerification.length`为0
11. `validateDatasetRuleVerification.nonExistentRef.length`为0
