# [PLAN] Resolve `shiki-core` Typecheck Gate Confusion

## Summary

The issue is not a TypeScript semantic hang in `@ravenhill/shiki-core`. The current evidence shows that `tsc` completes
normally outside the Codex sandbox, while sandboxed runs may fail before TypeScript or Vitest meaningfully execute
because of `EPERM` access errors under pnpm-managed `node_modules`.

The fix should therefore clarify the execution model rather than weaken the package gates:

- keep normal project validation strict;
- document sandbox-specific validation behavior;
- add an explicit diagnostic command for visibility when `typecheck` appears silent;
- avoid source, `tsconfig`, or public API changes unless later evidence shows a real package-level issue.

pnpm’s `--filter` is the right normal workspace gate because it restricts commands to selected packages, while `--dir`
is useful for targeted diagnostics because it runs pnpm as if started in a specific directory. TypeScript’s
`--extendedDiagnostics` is appropriate for debugging because it prints verbose compiler diagnostic data.

## Diagnosis

Observed facts:

- `pnpm --dir packages/shiki-core exec tsc --noEmit --pretty false --extendedDiagnostics` completes outside the sandbox
  in about `2.15s`.
- `pnpm --filter @ravenhill/shiki-core typecheck` completes outside the sandbox in about `14.55s`.
- The default script is silent while running because it is only `tsc --noEmit`.
- Inside the Codex sandbox, TypeScript or Vitest can fail before execution with `EPERM` while reading files under
  `node_modules/.pnpm/...`.

Conclusion:

- `typecheck` is a valid normal completion gate.
- The confusing part is diagnostic visibility plus sandbox behavior.
- There is no current evidence of a source-level TypeScript issue.

## Non-goals

- Do not change `tsconfig.json`.
- Do not add `--extendedDiagnostics` to the default `typecheck` script.
- Do not weaken `typecheck`, `test`, or `build` as package gates.
- Do not attempt to solve Codex sandbox filesystem permissions from repository code.
- Do not change public API exports, runtime behavior, package output, or build artifacts.

## Phase 1 — Correct the Traceability Note

Update the traceability note so it no longer says that `typecheck` is blocked.

Replace the current framing with something closer to:

> `@ravenhill/shiki-core` typechecking passes in normal execution. Previous confusion came from two factors: the package
> script is silent while `tsc --noEmit` runs, and Codex sandbox runs can fail before meaningful TypeScript execution
> because of `EPERM` access to pnpm-managed `node_modules`. No source-level TypeScript issue was found.

The note should distinguish three execution contexts:

| Context              |                                                         Expected behavior | Gate status |
| -------------------- | ------------------------------------------------------------------------: | ----------- |
| Local / normal shell |                      `typecheck` passes, possibly after a silent interval | Required    |
| CI / normal runner   |                          `typecheck`, `test`, and `build` remain required | Required    |
| Codex sandbox        | may require escalation; otherwise document `EPERM` as environment-limited | Conditional |

## Phase 2 — Add an Explicit Diagnostic Script

Add a diagnostic-only package script in `packages/shiki-core/package.json`:

```json
{
    "scripts": {
        "typecheck:diagnostics": "pnpm exec tsc --noEmit --pretty false --extendedDiagnostics"
    }
}
```

Keep the existing script unchanged:

```json
{
    "scripts": {
        "typecheck": "tsc --noEmit"
    }
}
```

Rationale:

- `typecheck` should remain quiet and suitable for CI.
- `typecheck:diagnostics` gives maintainers timing and file-count visibility only when needed.
- This avoids normalizing noisy compiler output as part of the default developer workflow.

## Phase 3 — Document the Debugging Workflow

Add a short troubleshooting note near the traceability note or package maintenance docs.

Suggested wording:

````markdown
### Typecheck diagnostics

`@ravenhill/shiki-core` typechecking can appear silent because the default script runs `tsc --noEmit`.

Use the diagnostic command only when the default check appears stuck:

```bash
pnpm --filter @ravenhill/shiki-core typecheck:diagnostics
```
````

Equivalent direct package command:

```bash
pnpm --dir packages/shiki-core exec tsc --noEmit --pretty false --extendedDiagnostics
```

If a Codex sandbox run fails with `EPERM` under `node_modules/.pnpm`, treat it as an execution-environment permission
failure. Re-run with sandbox escalation when available, or record the command as not executable in that environment. Do
not treat this as a source-level TypeScript failure unless the same command fails outside the sandbox.

````
## Phase 4 — Restore Normal Completion Gates

Re-enable `typecheck` as a normal completion gate for `@ravenhill/shiki-core`.

Required normal validation:

```bash
pnpm --filter @ravenhill/shiki-core typecheck
pnpm --filter @ravenhill/shiki-core test
pnpm --filter @ravenhill/shiki-core build
````

Diagnostic validation, only when needed:

```bash
pnpm --filter @ravenhill/shiki-core typecheck:diagnostics
```

Direct package diagnostic fallback:

```bash
pnpm --dir packages/shiki-core exec tsc --noEmit --pretty false --extendedDiagnostics
```

## Phase 5 — Acceptance Criteria

The plan is complete when:

- the traceability note says `typecheck` passes in normal execution;
- sandbox `EPERM` is documented as an environment-specific validation limitation;
- `packages/shiki-core/package.json` includes `typecheck:diagnostics`;
- the existing `typecheck` script remains unchanged;
- normal completion gates include `typecheck`, `test`, and `build`;
- no `tsconfig.json`, source, public API, or package output changes are introduced;
- maintainers have a clear command to run when `typecheck` appears silent.

## Risk Controls

- **Risk:** Future maintainers misread a silent `typecheck` as a hang.\
  **Control:** Document `typecheck:diagnostics` and expected silent runtime.

- **Risk:** Sandbox `EPERM` causes false negative validation reports.\
  **Control:** Require escalation or explicitly mark the command as environment-blocked.

- **Risk:** Diagnostic output pollutes normal CI logs.\
  **Control:** Keep diagnostics opt-in.

- **Risk:** A real TypeScript regression is hidden behind the sandbox explanation.\
  **Control:** Only classify failures as sandbox-limited when the same command passes outside the sandbox.

## Result

Implemented on May 27, 2026.

- `packages/shiki-core/package.json` now includes `typecheck:diagnostics` while keeping `typecheck` unchanged. The
  diagnostic script uses `pnpm exec tsc ...` because that form reliably prints TypeScript's diagnostic metrics.
- The package README documents the diagnostic workflow and the Codex sandbox `EPERM` limitation.
- The closed traceability notes now restore `typecheck` as a normal completion gate and classify sandbox `EPERM` as an
  environment-specific validation limit.
- No source, `tsconfig`, public API, package output, or runtime behavior changes were introduced.

## References

- TypeScript compiler options: `--extendedDiagnostics` is a verbose diagnostic flag for compiler debugging.
  :contentReference[oaicite:1]{index=1}
- pnpm filtering: `--filter` restricts commands to selected workspace packages. :contentReference[oaicite:2]{index=2}
- pnpm CLI options: `--dir` runs pnpm as if started from the given directory. :contentReference[oaicite:3]{index=3}
