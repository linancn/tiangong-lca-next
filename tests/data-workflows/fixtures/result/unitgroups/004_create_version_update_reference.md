# create

1. 数据库可根据id查询到刚创建的数据
2. `json_ordered`字段和创建数据上传的`jsonOrdered`一致
3. `user_id`和当前用户`id`一致
4. `state_code`为0
5. `version`为`01.01.000`
6. `team_id`为`NULL`
7. `rule_verification`为`TRUE`
8. `reviews`为`NULL`

# create version

9. 数据库可根据相同`id`和新`version`查询到新增版本数据
10. `id`和刚创建数据一致
11. `version`为`01.01.001`
12. `json_ordered`中除`common:dataSetVersion`、`common:timeStamp`、`common:permanentDataSetURI`外其余字段和刚创建数据一致
13. `rule_verification`为`TRUE`

# update reference

14. 数据库可根据相同`id`和新`version`查询到更新引用后的数据
15. `version`仍为`01.01.001`
16. `rule_verification`为`TRUE`
