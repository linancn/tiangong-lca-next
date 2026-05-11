# 本文档描述过程数据校验在运行时重写引用后的期望结果

1. 数据库可根据id查询到已更新的数据
2. `json_ordered`字段和第二阶段上传的`jsonOrdered`一致
3. `user_id`和当前用户`id`一致
4. `state_code`为0
5. `version`为`01.01.000`
6. `team_id`为`NULL`
7. `rule_verification`为`TRUE`
8. `reviews`为`NULL`
9. `json_ordered.processDataSet.exchanges.exchange.0.referenceToFlowDataSet` equals `testFlowReference`
10. `json_ordered.processDataSet.modellingAndValidation.dataSourcesTreatmentAndRepresentativeness.referenceToDataSource` equals `testSourceReference`
11. `json_ordered.processDataSet.administrativeInformation.dataEntryBy.common:referenceToDataSetFormat` equals `testSourceReference`
12. `json_ordered.processDataSet.administrativeInformation.dataEntryBy.common:referenceToPersonOrEntityEnteringTheData` equals `testContactReference`
13. `json_ordered.processDataSet.administrativeInformation.publicationAndOwnership.common:referenceToOwnershipOfDataSet` equals `testContactReference`
14. `json_ordered.processDataSet.administrativeInformation.common:commissionerAndGoal.common:referenceToCommissioner` equals `testContactReference`
