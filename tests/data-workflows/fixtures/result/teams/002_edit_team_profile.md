Team edit expectations organized by persisted database fields.

## `teams` table

1. `steps.edit.team.exists` equals `true`
2. `steps.edit.team.id` equals `__TEAM_ID__`
3. `steps.edit.team.is_public` equals `__FIXTURE_IS_PUBLIC__`
4. `steps.edit.team.json` equals `__FIXTURE_JSON__`
5. `steps.edit.team.rank` equals `__FIXTURE_RANK__`

## `roles` table (`owner` membership row)

6. `steps.edit.ownerRole.role` equals `owner`
7. `steps.edit.ownerRole.user_id` equals `__OWNER_USER_ID__`
8. `steps.edit.ownerRole.team_id` equals `__TEAM_ID__`
