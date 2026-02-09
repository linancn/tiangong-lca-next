# Team Management

## Roles

1. **owner**: Invite and delete users, set user roles, modify team information.
2. **admin**: Invite and delete users, modify team information.
3. **member**: View permission only.

## Business Logic

1. **Click My Team**: a. User is in a team: Display team information and member information. b. User is not in any team: Pop up a prompt that the user can join a team or create a team. i. Join a team: Display all team information with rank≥0, and the user contacts the team via email to join. ii. Create a team: Fill in team information.
2. **Member Information**: Perform member management operations according to roles.

```mermaid
flowchart TD
    A[Enter My Team]
    B{Is the user in a team?}
    C{Select operation type?}
    D{Current user role?}
    E[Display all teams with rank≥0]
    F[Fill in and submit team information]
    G[User becomes the owner of the team]
    H[User contacts the team via email to apply for joining]
    I[owner/admin sends an invitation]
    J{Does the user accept the invitation?}
    K[User becomes a member of the team]
    L[User does not join the team]
    M[1.Invite/delete users<br>2.Set user roles to admin/member<br>3.Modify team information]
    N[1.Invite/delete users<br>2.Modify team information]
    O[View permission only]

    A --> B
    B -->|Yes| D
    B -->|No| C
    C -->|Join a team| E
    C -->|Create a team| F
    E --> H
    H --> I
    I --> J
    J -->|Yes| K
    J -->|No| L
    F --> G
    D -->|owner| M
    D -->|admin| N
    D -->|member| O
```
