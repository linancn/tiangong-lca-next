# view source

1. 调用`getFlowpropertyDetail(id, version)`成功
2. 返回的`id`和创建数据的`id`一致
3. 返回的`version`为`01.01.000`
4. 返回的`json`和数据库中的`json`一致

# copy

5. 数据库可根据复制后的新`id`查询到复制后的数据
6. 复制后的`id`不等于原数据`id`
7. 复制后的`version`为`01.01.000`
8. 复制后的`state_code`为0
9. 复制后的`user_id`和当前用户`id`一致
10. 复制后的`team_id`为`NULL`
11. 复制后的`rule_verification`和复制提交时计算结果一致
12. 复制后的`json_ordered`中除`common:UUID`、`common:timeStamp`、`common:permanentDataSetURI`外其余字段和创建数据一致
13. 复制后的`json_ordered`中的`common:UUID`为复制后的`id`
14. 复制后的`json_ordered`中的`common:permanentDataSetURI`和复制后的`id`、`version`一致

# view copy

15. 调用`getFlowpropertyDetail(copyId, version)`成功
16. 返回的`id`和复制后的数据`id`一致
17. 返回的`version`为`01.01.000`
18. 返回的`json`和数据库中的`json`一致
