Team homepage rank expectations organized by persisted database fields.

## `teams` table after hide

1. `steps.hide.team.exists` equals `true`
2. `steps.hide.team.id` equals `__TEAM_ID__`
3. `steps.hide.team.rank` equals `__FIXTURE_HIDE_RANK__`

## homepage visibility derived from `teams.rank > 0`

4. `steps.hide.homepageVisible` equals `false`

## `teams` table after show

5. `steps.show.team.exists` equals `true`
6. `steps.show.team.id` equals `__TEAM_ID__`
7. `steps.show.team.rank` equals `__FIXTURE_VISIBLE_RANK__`

## homepage visibility derived from `teams.rank > 0`

8. `steps.show.homepageVisible` equals `true`
