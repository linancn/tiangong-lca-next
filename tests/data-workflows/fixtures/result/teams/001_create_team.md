Team create expectations organized by persisted database fields.

## `teams` table

1. `steps.create.team.exists` equals `true`
2. `steps.create.team.id` equals `__TEAM_ID__`
3. `steps.create.team.is_public` equals `__FIXTURE_IS_PUBLIC__`
4. `steps.create.team.json` equals `__FIXTURE_JSON__`
5. `steps.create.team.rank` equals `__FIXTURE_RANK__`

## `roles` table (`owner` membership row)

6. `steps.create.ownerRole.role` equals `owner`
7. `steps.create.ownerRole.user_id` equals `__OWNER_USER_ID__`
8. `steps.create.ownerRole.team_id` equals `__TEAM_ID__`
