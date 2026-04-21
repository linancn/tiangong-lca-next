# Audit Status Reference

> Purpose: exact state-code meaning and transition rules for the audit workflow.

## Core Tables

| Table              | Role                            |
| ------------------ | ------------------------------- |
| `Lifecyclesmodels` | model data                      |
| `Processes`        | process data                    |
| `Flows`            | flow data                       |
| `Flowproperties`   | flow property data              |
| `Unitgroups`       | unit-group data                 |
| `Sources`          | source data                     |
| `Contacts`         | contact data                    |
| `reviews`          | audit-administrator review task |
| `comments`         | auditor comment task            |

## Status Codes

### General Data Tables

| Code  | Meaning                                           |
| ----- | ------------------------------------------------- |
| `0`   | assigned to My Data, unsubmitted                  |
| `20`  | assigned to My Data, submitted and unaudited      |
| `100` | assigned to Open Data, audited and approved       |
| `200` | assigned to Commercial Data, audited and approved |

### `comments` Table

| Code | Meaning                                       |
| ---- | --------------------------------------------- |
| `-3` | rejected by auditor                           |
| `-2` | auditor removed                               |
| `-1` | rejected by audit administrator during review |
| `0`  | auditor assigned, not audited yet             |
| `1`  | approved by auditor                           |
| `2`  | approved by administrator in review           |

### `reviews` Table

| Code | Meaning                             |
| ---- | ----------------------------------- |
| `-1` | audit rejected                      |
| `0`  | data unassigned                     |
| `1`  | data pending audit                  |
| `2`  | approved by administrator in review |

## Transition Rules

| Event | Required state updates |
| --- | --- |
| submit editable model data into audit queue | model `state_code -> 20`; create or update `reviews.state_code -> 0` |
| initial review rejects a submission before auditor assignment | `reviews.state_code -> -1`; related data and referenced data reset to `0` |
| assign previously unassigned data | `reviews.state_code -> 1`; `comments.state_code -> 0` |
| remove an assigned auditor | remove the reviewer from `reviews`; matching `comments.state_code -> -2` |
| auditor approves pending data | `comments.state_code -> 1` |
| auditor rejects pending data | `comments.state_code -> -3` |
| final audit approval | `comments.state_code -> 2`; `reviews.state_code -> 2`; related data and referenced data move to `100` unless already `100` or `200` |
| final audit rejection after auditor review | `reviews.state_code -> -1`; related data and referenced data reset to `0`; `comments.state_code -> -1` |

## Process Summary

1. draft data exists in editable state
2. submission creates or updates the review ledger
3. audit administrator performs initial review
4. auditor approves or rejects
5. audit administrator performs final review
6. final approval promotes state; final rejection restores editable state
