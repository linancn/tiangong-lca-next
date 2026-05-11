Team reject/reinvite expectations organized by database rows and RPC result fields.

## `roles` table after reject

1. `steps.reject.role.role` equals `rejected`
2. `steps.reject.role.user_id` equals `__INVITEE_USER_ID__`
3. `steps.reject.role.team_id` equals `__TEAM_ID__`

## `roles` table after re-invite

4. `steps.reinvite.role.role` equals `is_invited`
5. `steps.reinvite.role.user_id` equals `__INVITEE_USER_ID__`
6. `steps.reinvite.role.team_id` equals `__TEAM_ID__`

## `qry_notification_get_my_team_items` after re-invite

7. `steps.reinvite.notification.exists` equals `true`
8. `steps.reinvite.notification.role` equals `is_invited`
9. `steps.reinvite.notification.user_id` equals `__INVITEE_USER_ID__`
10. `steps.reinvite.notification.team_id` equals `__TEAM_ID__`

After reject, `qry_notification_get_my_team_items` may still return the consumed invite row; notification cleanup is not part of this smoke contract.
