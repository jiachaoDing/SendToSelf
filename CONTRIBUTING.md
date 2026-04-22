# Contributing

Keep changes aligned with the core product:

- improve the single-user inbox flow
- make self-hosting clearer or more reliable
- fix bugs in the current web or server behavior

## Before Opening a PR

- keep the change focused
- avoid unrelated refactors
- update docs when behavior, setup, or deployment changes

## Local Setup

Use [`docs/development.md`](docs/development.md).

## Validation

Run the smallest relevant checks before submitting:

```powershell
pnpm --filter web build
pnpm --filter server build
pnpm --filter server test:e2e
```

## Pull Requests

Include:

- what problem the change solves
- how you verified it
- screenshots when the UI changed

## Issues

For bugs, include:

- steps to reproduce
- expected behavior
- actual behavior
- environment details
- logs or screenshots when useful
