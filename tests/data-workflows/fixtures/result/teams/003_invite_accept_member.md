Team invite/accept expectations organized by database rows and RPC result fields.

## `roles` table after invite

1. `steps.invite.role.role` equals `is_invited`
2. `steps.invite.role.user_id` equals `__INVITEE_USER_ID__`
3. `steps.invite.role.team_id` equals `__TEAM_ID__`

## `qry_notification_get_my_team_items` after invite

4. `steps.invite.notification.exists` equals `true`
5. `steps.invite.notification.role` equals `is_invited`
6. `steps.invite.notification.user_id` equals `__INVITEE_USER_ID__`
7. `steps.invite.notification.team_id` equals `__TEAM_ID__`

## `roles` table after accept

8. `steps.accept.role.role` equals `member`
9. `steps.accept.role.user_id` equals `__INVITEE_USER_ID__`
10. `steps.accept.role.team_id` equals `__TEAM_ID__`

## `qry_team_get_member_list` after accept

11. `steps.accept.memberListRole.role` equals `member`
12. `steps.accept.memberListRole.email` equals `__INVITEE_EMAIL__`
13. `steps.accept.memberListRole.team_id` equals `__TEAM_ID__`

## `qry_notification_get_my_team_items` after accept

14. `steps.accept.notification.exists` equals `false`
