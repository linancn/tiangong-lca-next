# Team Management Reference

> Purpose: exact role and flow rules for the team-management domain.

## Roles

| Role     | Allowed actions                                                     |
| -------- | ------------------------------------------------------------------- |
| `owner`  | invite users, delete users, set user roles, modify team information |
| `admin`  | invite users, delete users, modify team information                 |
| `member` | view only                                                           |

## Entry Flow: My Team

| User state             | Result                                       |
| ---------------------- | -------------------------------------------- |
| user already in a team | show team information and member information |
| user not in a team     | prompt to join a team or create a team       |

## Join vs Create Flow

| Action        | Result                                                               |
| ------------- | -------------------------------------------------------------------- |
| join a team   | show teams with `rank >= 0`; user contacts the team by email to join |
| create a team | user fills team information and becomes the owner after creation     |

## Member-Management Rule

Member-management actions are always role-gated:

- `owner`: full team-management surface
- `admin`: limited team-management surface
- `member`: no management actions
