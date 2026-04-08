# oh-my-codex v0.12.3

**Follow-up patch release for `$team` prompt-routing correctness and duplicate team launch teardown**

`0.12.3` is a tight follow-up to `0.12.2` that ships PR [#1364](https://github.com/Yeachan-Heo/oh-my-codex/pull/1364), which was intended to land in `0.12.2` but finished its conflict resolution after the `0.12.2` cut. This release closes that gap so operators get the corrected `$team` keyword routing and the duplicate same-name team launch guard.

## Highlights

- `$team` detected in `UserPromptSubmit` now seeds root `team-state.json` and nudges operators toward `omx team ...` / `omx team --help` instead of silently misrouting the prompt.
- `startTeam` now rejects duplicate active same-name team launches with a `team_name_conflict` error before mutating team state or provisioning worktrees.
- Release metadata and collateral are aligned to `0.12.3`.

## What’s Changed

### Fixes
- seed root `team-state.json` when `$team` is detected in `UserPromptSubmit` and route operators toward `omx team ...` / `omx team --help` (PR [#1364](https://github.com/Yeachan-Heo/oh-my-codex/pull/1364))
- reject duplicate active same-name team launches before state mutation or worktree provisioning, preserving the existing team config and tasks (PR [#1364](https://github.com/Yeachan-Heo/oh-my-codex/pull/1364))

### Changed
- bump release metadata from `0.12.2` to `0.12.3` across Node/Cargo manifests, changelog, and release collateral

## Verification

- `npm run build`
- `npm run lint`
- `npm test`
- `npm run smoke:packed-install`

## Remaining risk

- This verification is still local; it is not a full GitHub Actions matrix rerun.
- PR #1364 touches live `$team` keyword handling and `startTeam` state seeding; post-release monitoring should watch for any regressions in prompt-driven team launch paths.

## Contributors

- [@Yeachan-Heo](https://github.com/Yeachan-Heo) (Bellman)

**Full Changelog**: [`v0.12.2...v0.12.3`](https://github.com/Yeachan-Heo/oh-my-codex/compare/v0.12.2...v0.12.3)
