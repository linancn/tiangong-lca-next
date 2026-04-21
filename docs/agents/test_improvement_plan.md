# Testing Strategy

> Long-term testing strategy. Use `docs/agents/test_todo_list.md` for current operational state.

## Strategic State

- current strategy is maintenance, not expansion for its own sake
- full closure already exists; the job is to preserve it while the codebase changes
- add integration-test expansion only when it reduces real product risk

## Operating Principles

- every touched behavior ships with matching proof
- current-state queue data belongs in `test_todo_list.md`
- make strategy changes explicit
- dead branches should be removed instead of defended by artificial tests

## Integration Testing North Star

Add integration tests when they protect one of these:

- route-level user workflows
- auth and permission boundaries
- service wiring across providers or pages
- regression-prone shared UI behavior

## Reopen Strategy Work Only When

- current tests stop protecting important workflows
- repeated incidents show a missing integration boundary
- the validation system changes enough that the current model becomes misleading

## Done Definition

The strategy is working when:

- full closure remains intact
- test additions track real product risk
- current-state docs stay small because the queue stays closed
