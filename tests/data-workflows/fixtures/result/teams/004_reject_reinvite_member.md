Team reject/reinvite expectations organized by database rows and RPC result fields.

## `roles` table after reject

1. `steps.reject.role.role` equals `rejected`
2. `steps.reject.role.user_id` equals `__INVITEE_USER_ID__`
3. `steps.reject.role.team_id` equals `__TEAM_ID__`

## `qry_notification_get_my_team_items` after reject

4. `steps.reject.notification.exists` equals `false`

## `roles` table after re-invite

5. `steps.reinvite.role.role` equals `is_invited`
6. `steps.reinvite.role.user_id` equals `__INVITEE_USER_ID__`
7. `steps.reinvite.role.team_id` equals `__TEAM_ID__`

## `qry_notification_get_my_team_items` after re-invite

8. `steps.reinvite.notification.exists` equals `true`
9. `steps.reinvite.notification.role` equals `is_invited`
10. `steps.reinvite.notification.user_id` equals `__INVITEE_USER_ID__`
11. `steps.reinvite.notification.team_id` equals `__TEAM_ID__`
