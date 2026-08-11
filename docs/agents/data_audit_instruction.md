---
title: next Audit Status Reference
docType: reference
scope: repo
status: active
authoritative: false
owner: next
language: en
whenToUse:
  - when checking audit-state meaning
  - when validating allowed workflow transitions
  - when changing review or audit-management screens
whenToUpdate:
  - when audit-state codes change
  - when workflow transitions change
  - when the owning review-management UI paths move
checkPaths:
  - docs/agents/data_audit_instruction.md
  - src/pages/Review/**
  - src/pages/ManageSystem/**
lastReviewedAt: 2026-08-11
lastReviewedCommit: 07467b98423473223d84f5169415062d33eaaa15
lastReviewedNote: 'Reviewed for Issue #807: flatten Root and Reference reviews into the paginated queue and retain child tables only for Process/Lifecycle Model Roots.'
---

# Audit Status Reference

> Purpose: exact state-code meaning and transition rules for the audit workflow.

## Core Tables

| Table             | Role                                               |
| ----------------- | -------------------------------------------------- |
| `lifecyclemodels` | model data                                         |
| `processes`       | process data                                       |
| `flows`           | flow data                                          |
| `flowproperties`  | flow-property data                                 |
| `unitgroups`      | unit-group data                                    |
| `sources`         | source data                                        |
| `contacts`        | contact data                                       |
| `reviews`         | Root, Reference, and immutable legacy review tasks |
| `comments`        | assigned Review Member opinions                    |

New reviews use `review_kind = root | reference`. Migrated legacy source rows retain `review_kind = null` and remain read-only history. A Root Review stores its append-only reference relation in `scope_history`; a Reference Review is shared by every Root Review that uses the same exact dataset revision.

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
| submit an editable dataset | create a Root Review, or a new Reference Review when repairing a rejected reference; target `state_code: 0 -> 20`; new `reviews.state_code = 0` |
| submit a Root Review with references | create or reuse an exact Reference Review for every readable reference; append one immutable Root scope snapshot; referenced drafts enter `20` without broadening the submitter's access |
| Review Admin rejects before assignment or after assignment | `reviews.state_code -> -1`; only that review's target may return `20 -> 0`; all non-revoked comments `0/1/-3 -> -1`; revoked `-2` comments remain unchanged |
| assign previously unassigned data | `reviews.state_code -> 1`; `comments.state_code -> 0` |
| remove an assigned auditor | remove the reviewer from `reviews`; matching `comments.state_code -> -2` |
| Review Member approves | `comments.state_code -> 1`; simple Root/Reference approval has no opinion field |
| Review Member rejects | a non-empty reason is required; `comments.state_code -> -3` |
| Review Admin finally approves | after all current Review Members have completed, `comments.state_code -> 2`, `reviews.state_code -> 2`, and only the exact review target moves `20 -> 100` |

Review Member outcomes are advisory. Review Admin may finally approve even when every Review Member used `-3`, and may reject before every Review Member has completed. A Root Review may be approved while its Reference Reviews are still pending; this does not approve or release those references. Conversely, a Reference Review continues independently when its only Root Review is rejected.

Process and Lifecycle Model Root Reviews retain their existing metadata form and metadata writeback. Contact, Source, Unit Group, Flow Property, Flow, and every Reference Review use only approve/reject actions: approve requires no opinion; reject requires a reason.

## Process Summary

1. each of the seven edit pages shows one `Submit Review` action
2. Process first completes the existing numeric Gate; the other six types do not calculate a Gate
3. the database decides Root versus rejected-Reference repair and records exact relations
4. Review Admin assigns Review Members; assignment sends no notification
5. Review Members record advisory opinions
6. Review Admin makes the final decision and only the data owner receives the result notification
7. rejection reasons are shown through notifications; dataset detail pages are unchanged
8. Review Management shows every matching Root and Reference Review as its own row in the top-level paginated table
9. only Process and Lifecycle Model Root rows can expand; their child table shows current Reference Reviews that match the selected tab
10. every top-level row keeps its own selectable action when the actor has permission; Review Members see only their assigned/readable reviews
11. the child table does not show a reference-path column, and no persisted or visible reference-overview field is required
12. every readable Root or Reference row exposes a view icon that opens the existing read-only Contact, Source, Unit Group, Flow Property, Flow, Process, or Lifecycle Model drawer; viewing does not alter review state or access
