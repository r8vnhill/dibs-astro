# [DONE] Cycle 5: Integrate Architecture Checks into Local and CI Gates

## Summary

Make architecture boundary checking part of the repository’s standard verification workflow.

**Status:** Implemented.

`pnpm check:architecture` already exists and passes. Cycle 5 wires it into the normal local gate, updates GitLab CI to
execute that same gate, and refreshes contributor-facing documentation so the expected workflow is unambiguous.

GitLab remains the authoritative CI system. GitHub Actions stays manual-only.

## Implementation Notes

- `pnpm check` now runs `pnpm run check:architecture` after the existing generated-data and Astro checks.
- `.gitlab-ci.yml` now uses `test:check` with `pnpm check` instead of the previous `test:astro-check` job.
- Build and deploy jobs now depend on `test:check`.
- GitHub Actions remains manual-only.
- Contributor-facing workflow docs now describe `pnpm check` as the standard gate and `pnpm check:architecture` as the focused debugging command.

## Goal

After this cycle, contributors and CI should use the same primary quality gate:

```bash
pnpm check
```

That command should include:

1. generated data validation;
2. Astro/type/static checks already covered by `pnpm check`;
3. architecture boundary checking.

The focused architecture command remains available for local debugging:

```bash
pnpm check:architecture
```

## Key Changes

### 1. Update `package.json`

Keep the focused architecture command:

```json
"check:architecture": "..."
```

Update `check` so it runs the architecture gate as part of the normal local verification path.

Preferred order:

```json
"check": "... existing generated-data validation ... && pnpm run check:architecture && ... existing checks ..."
```

Use the current script structure as the source of truth. The important invariant is that `pnpm check` must fail when
architecture boundaries fail.

Do not rename `check:architecture`.

### 2. Update GitLab CI

Replace the current `test:astro-check` job with a broader local-check job.

Suggested job name:

```yaml
test:check
```

Expected behaviour:

```yaml
script:
    - pnpm check
```

Update all downstream `needs` entries that currently reference `test:astro-check` so they reference the new job name.

Preserve existing behaviour for:

- `test:unit`;
- `test:astro-render`;
- `build`;
- `deploy`;
- cache configuration;
- install strategy;
- branch/tag rules.

The CI should mirror the local developer workflow instead of duplicating only part of it.

### 3. Keep GitHub Actions manual-only

Do not enable push or pull-request triggers in `.github/workflows/ci.yml`.

Only update the workflow text if it still gives unclear or stale guidance about the active GitLab workflow.

GitHub Actions should remain a secondary/manual diagnostic path.

### 4. Update contributor-facing documentation

Update `README.md`.

Command table:

- state that `pnpm check` includes architecture boundary checking;
- keep `pnpm check:architecture` as the focused architecture-only command.

Quality gates section:

- describe `pnpm check` as the standard local pre-commit/pre-push gate;
- describe `pnpm check:architecture` as the focused boundary-debugging gate.

Update `AGENTS.md`.

Workflow section:

- mention that `pnpm check` now includes architecture enforcement;
- avoid instructing contributors to run `pnpm check:architecture` separately unless they are debugging boundary
  findings.

Update `docs/architecture/layer-separation.md`.

Remove or replace any statement saying that `check:architecture` is intentionally separate from `pnpm check`.

New expected wording:

```text
Architecture boundary checks are part of the standard `pnpm check` gate.
Use `pnpm check:architecture` when you need a focused architecture-only check.
```

## Implementation Cycles

### Cycle 5.1: Wire architecture checks into `pnpm check`

Change `package.json` first.

Verify:

```bash
pnpm check:architecture
pnpm check
```

Expected result:

- both commands pass;
- `pnpm check` invokes architecture checking;
- `check:architecture` remains callable independently.

### Cycle 5.2: Replace the GitLab check job

Update `.gitlab-ci.yml`.

Tasks:

- rename or replace `test:astro-check` with `test:check`;
- run `pnpm check` in that job;
- update all `needs` references;
- confirm no job still references `test:astro-check`;
- preserve build and deploy dependencies.

Suggested manual inspection command:

```bash
grep -R "test:astro-check" .gitlab-ci.yml
```

Expected result:

```text
no matches
```

### Cycle 5.3: Refresh documentation

Update:

```text
README.md
AGENTS.md
docs/architecture/layer-separation.md
```

Ensure all docs agree on the same workflow:

```bash
pnpm check
```

as the standard local and CI quality gate.

### Cycle 5.4: Final verification

Run focused checks:

```bash
pnpm check:architecture
pnpm check
```

Run broader checks if CI-related changes are non-trivial:

```bash
pnpm test:unit
pnpm test:astro
```

Inspect CI shape:

```bash
grep -R "test:check" .gitlab-ci.yml
grep -R "test:astro-check" .gitlab-ci.yml
```

Expected result:

- `test:check` exists;
- downstream `needs` point to `test:check`;
- `test:astro-check` no longer appears.

## Test Plan

### Required

```bash
pnpm check:architecture
pnpm check
```

### Required CI-shape review

Verify manually that:

- `.gitlab-ci.yml` contains the new `test:check` job;
- no `needs` entry points to the removed `test:astro-check` job;
- `build` and `deploy` dependencies still match the intended pipeline order.

### Optional broader regression checks

```bash
pnpm test:unit
pnpm test:astro
```

Run these if the package scripts, CI dependencies, or documentation examples reveal ambiguity.

## Acceptance Criteria

- `pnpm check` runs architecture boundary checking.
- `pnpm check:architecture` remains available as a focused command.
- GitLab CI has a check job that runs `pnpm check`.
- No GitLab CI job references the removed `test:astro-check` name.
- Existing unit, Astro render, build, and deploy behaviour is preserved.
- GitHub Actions remains manual-only.
- `README.md`, `AGENTS.md`, and `docs/architecture/layer-separation.md` describe the same workflow.
- No runtime dependency is added.
- No checker APIs or boundary-finding terminology are renamed.
- No changelog update is required.

## Non-Goals

- Do not change the architecture checker implementation.
- Do not rename `pnpm check:architecture`.
- Do not add broad allowlist entries.
- Do not enable GitHub Actions for push or pull-request events.
- Do not change build or deploy semantics.
- Do not introduce a separate CI-only check command unless the existing local command cannot be reused.

## Assumptions

- GitLab CI is the active CI system.
- `pnpm check` is the canonical local quality gate.
- Architecture findings should block CI once this cycle lands.
- Documentation should guide contributors toward `pnpm check` first and `pnpm check:architecture` only for focused
  debugging.

## References

- GitLab CI `needs` is the relevant mechanism for expressing job dependencies and must be kept consistent when renaming
  jobs.
- npm/pnpm script composition should preserve focused commands while allowing higher-level aggregate gates such as
  `check`.
- The architectural motivation follows the existing layer-separation policy: boundary rules are only effective when they
  are part of the normal verification path, not an optional side check.
