Team member role expectations organized by database rows and RPC result fields.

## `roles` table after promote

1. `steps.promote.role.role` equals `admin`
2. `steps.promote.role.user_id` equals `__MEMBER_USER_ID__`
3. `steps.promote.role.team_id` equals `__TEAM_ID__`

## `qry_team_get_member_list` after promote

4. `steps.promote.memberListRole.role` equals `admin`
5. `steps.promote.memberListRole.user_id` equals `__MEMBER_USER_ID__`
6. `steps.promote.memberListRole.team_id` equals `__TEAM_ID__`

## `roles` table after demote

7. `steps.demote.role.role` equals `member`
8. `steps.demote.role.user_id` equals `__MEMBER_USER_ID__`
9. `steps.demote.role.team_id` equals `__TEAM_ID__`

## `qry_team_get_member_list` after demote

10. `steps.demote.memberListRole.role` equals `member`
11. `steps.demote.memberListRole.user_id` equals `__MEMBER_USER_ID__`
12. `steps.demote.memberListRole.team_id` equals `__TEAM_ID__`

## member removed state

13. `steps.remove.role.exists` equals `false`
14. `steps.remove.memberListRole.exists` equals `false`
