# Data Workflow Result Fixture Relationships

This directory stores the expected-result documents for data workflow smoke
scripts. Keep these files aligned with the matching input fixture, workflow lib,
and unit test whenever a workflow assertion changes.

## Directory Contract

- `tests/data-workflows/fixtures/data/<scope>/<case>.json` is the primary input
  payload.
- `tests/data-workflows/fixtures/result/<scope>/<case>.md` is the expected
  persisted result or workflow assertion set for that case.
- `tests/data-workflows/workflows/<scope>/*-workflow-lib.ts` binds the default
  data and result fixture paths.
- `tests/data-workflows/unit/<scope>/*workflow-lib.test.ts` pins the default
  path relationship and expectation parsing.
- `tests/data-workflows/runtime/<scope>/<case>.last-run.json` is the optional
  last-run artifact derived from a fixture path; it is not a source fixture.

## Scope Map

| Result scope | Data scope | Workflow owner | Unit proof |
| --- | --- | --- | --- |
| `contacts` | `contacts` | `workflows/contacts/*-workflow-lib.ts` | `unit/contacts/*workflow-lib.test.ts` |
| `flowProperties` | `flowProperties` | `workflows/flowproperties/*-workflow-lib.ts` | no scope-specific unit directory yet; add one before changing workflow-lib path defaults |
| `flows` | `flows` | `workflows/flows/*-workflow-lib.ts` | `unit/flows/*workflow-lib.test.ts` |
| `lifeCycleModels` | `lifeCycleModels` | `workflows/lifecyclemodels/lifecyclemodels-workflow-lib.ts` | `unit/lifecyclemodels/*workflow-lib.test.ts` |
| `processes` | `processes` | `workflows/processes/*-workflow-lib.ts` | `unit/processes/*workflow-lib.test.ts` |
| `sources` | `sources` | `workflows/sources/*-workflow-lib.ts` | `unit/sources/*workflow-lib.test.ts` |
| `teams` | `teams` | `workflows/teams/team-workflow-shared.ts` and `workflows/teams/*-workflow-lib.ts` | `unit/teams/*workflow*.test.ts` |
| `unitgroups` | `unitgroups` | `workflows/unitgroups/*-workflow-lib.ts` | `unit/unitgroups/*workflow-lib.test.ts` |

## Generic CRUD Dataset Cases

These relationships apply to `contacts`, `flowProperties`, `flows`,
`processes`, `sources`, and `unitgroups` unless a scope-specific note below says
otherwise.

| Result fixture | Primary data fixture | Workflow owner | Relationship |
| --- | --- | --- | --- |
| `001_create.md` | `001_create.json` | `<scope>-create-workflow-lib.ts` | Create assertion; reused as the seed-create expectation by check, edit, view-copy, full-text-search, and some process reference workflows. |
| `001_create_view_copy.md` | `001_create_view_copy.json` | `<scope>-create-view-copy-workflow-lib.ts` | View and copy assertion for the created original record and copied record. |
| `002_check_data_success.md` | `002_check_data_success.json` | `<scope>-check-data-workflow-lib.ts` | Validation-passing update assertion; also the success edit phase expectation. |
| `003_edit_data_validate_false.md` | `003_edit_data_validate_false.json` | `<scope>-edit-workflow-lib.ts` | Validation-failing edit assertion after the create and success-edit phases. |
| `004_create_version_update_reference.md` | `004_create_version_update_reference.json` | `<scope>-create-version-update-reference-workflow-lib.ts` | Version creation plus reference update assertion. |
| `005_create_contribute_team_create.md` | `005_create_contribute_team.json` | `<scope>-create-contribute-team-workflow-lib.ts` | Pre-contribution create-phase assertion. |
| `005_create_contribute_team.md` | `005_create_contribute_team.json` | `<scope>-create-contribute-team-workflow-lib.ts` | Team contribution assertion after the pre-contribution create phase. |
| `007_full_text_search.md` | `007_full_text_search.json` | `<scope>-full-text-search-workflow-lib.ts` | Search assertion; the workflow also uses `001_create.json` and `001_create.md` as the seed record baseline. |

## Scope-Specific Cases

| Result fixture | Primary data fixture | Workflow owner | Relationship |
| --- | --- | --- | --- |
| `lifeCycleModels/001_create.md` | `lifeCycleModels/001_create.json` | `lifecyclemodels-workflow-lib.ts` | Lifecycle model create assertion. |
| `lifeCycleModels/001_create_view_copy.md` | `lifeCycleModels/001_create_view_copy.json` | `lifecyclemodels-workflow-lib.ts` | Lifecycle model view-copy assertion. |
| `lifeCycleModels/002_check_data_success.md` | `lifeCycleModels/002_check_data_success.json` | `lifecyclemodels-workflow-lib.ts` | Lifecycle model validation-passing update assertion. |
| `lifeCycleModels/003_edit_data_validate_false.md` | `lifeCycleModels/003_edit_data_validate_false.json` | `lifecyclemodels-workflow-lib.ts` | Lifecycle model validation-failing edit assertion. |
| `lifeCycleModels/004_create_version_update_reference.md` | `lifeCycleModels/004_create_version_update_reference.json` | `lifecyclemodels-workflow-lib.ts` | Lifecycle model version and reference update assertion. |
| `lifeCycleModels/005_create_contribute_team.md` | `lifeCycleModels/005_create_contribute_team.json` | `lifecyclemodels-workflow-lib.ts` | Lifecycle model team contribution assertion. |
| `lifeCycleModels/007_full_text_search.md` | `lifeCycleModels/007_full_text_search.json` | `lifecyclemodels-workflow-lib.ts` | Lifecycle model full-text search assertion. |
| `processes/006_check_data_runtime_references.md` | `processes/006_check_data_runtime_references.json` | `processes-check-data-runtime-references-workflow-lib.ts` | Runtime reference rewrite assertion; also depends on contact, source, flow property, and flow reference seeds plus their create and check expected fixtures. |

## Team Cases

| Result fixture | Primary data fixture | Workflow owner | Relationship |
| --- | --- | --- | --- |
| `teams/001_create_team.md` | `teams/001_create_team.json` | `teams-create-workflow-lib.ts` and `team-workflow-shared.ts` | Team create assertion; reused as the setup expectation for edit, invite, reject/reinvite, member-role, and homepage-rank workflows. |
| `teams/002_edit_team_profile.md` | `teams/002_edit_team_profile.json` | `teams-edit-workflow-lib.ts` | Team profile edit assertion after team creation. |
| `teams/003_invite_accept_member.md` | `teams/003_invite_accept_member.json` | `teams-invite-accept-workflow-lib.ts` | Invite and accept assertion after team creation. |
| `teams/004_reject_reinvite_member.md` | `teams/004_reject_reinvite_member.json` | `teams-reject-reinvite-workflow-lib.ts` | Reject, reinvite, and accept assertion after team creation. |
| `teams/005_member_role_management.md` | `teams/005_member_role_management.json` | `teams-member-role-workflow-lib.ts` | Member role update assertion after team creation. |
| `teams/006_homepage_rank_management.md` | `teams/006_homepage_rank_management.json` | `teams-homepage-rank-workflow-lib.ts` | Homepage rank update assertion after team creation. |
