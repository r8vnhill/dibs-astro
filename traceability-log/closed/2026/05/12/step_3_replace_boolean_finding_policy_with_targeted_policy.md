# [DONE] Step 3: Replace Boolean Finding Policy With Targeted Policy

Status: complete.

Implemented in:

- `scripts/lib/pdf-export-cli.mjs`
- `scripts/lib/pdf-export-report.mjs`
- `scripts/export-lessons-pdf.mjs`
- `scripts/__tests__/pdf-export-cli.test.ts`
- `scripts/__tests__/pdf-export-report.test.ts`

Verification:

```bash
pnpm test:unit -- scripts/__tests__/pdf-export-cli.test.ts scripts/__tests__/pdf-export-report.test.ts
pnpm run check:lesson-export-core
```

## Summary

Replace the PDF exporter’s boolean `--fail-on-finding` option with a targeted, repeatable `--fail-on <findingKind>`
policy.

The new policy allows callers to fail only on selected finding kinds while preserving the old “fail on any finding”
behaviour for one transition cycle through the deprecated `--fail-on-finding` flag.

This step should remain a policy and CLI-contract change only. It should not redesign the report schema, DOM finding
collection, or report summary.

## Design Goals

1. **Make failure policy explicit and extensible.** Move from a boolean flag to a structured policy that can support
   targeted matching now and richer policy decisions later.

2. **Fail fast on invalid CLI input.** Unknown finding kinds should be rejected during argument parsing, before build,
   preview, or Playwright startup.

3. **Keep parsing pure.** `parseCliArgs()` should validate and normalize options, but should not emit warnings or write
   to stdout/stderr.

4. **Preserve compatibility for one transition cycle.** `--fail-on-finding` remains supported as a deprecated shorthand
   for “fail on any finding”.

5. **Avoid report-schema churn.** Support both current `{ code }` findings and core-style `{ kind }` findings during
   policy evaluation, but do not migrate DOM findings in this step.

## Proposed Policy Model

Use the confirmed sentinel design:

```ts
type FindingPolicy = {
    failOn: "any" | LessonExportFindingKind[];
};
```

Recommended semantics:

- `failOn: []` means findings are reported but never fatal.
- `failOn: "any"` means any reported finding is fatal.
- `failOn: ["unresolved-todo", "hidden-content"]` means only those normalized kinds are fatal.
- Legacy finding code aliases, such as `client-only`, are normalized through `normalizeExportFindingKind()` before
  matching.
- Unknown report finding codes are ignored for targeted matching, but may still be counted in the report summary.

## CLI Contract

### Supported Flags

Add support for both forms:

```bash
--fail-on unresolved-todo
--fail-on=unresolved-todo
```

Allow repeated usage:

```bash
--fail-on hidden-content --fail-on unresolved-todo
```

Keep the deprecated shorthand:

```bash
--fail-on-finding
```

This maps to:

```ts
{
    failOn: "any";
}
```

### Conflict Rule

Add an explicit rule for mixed policy flags:

```bash
--fail-on-finding --fail-on unresolved-todo
```

Recommended behaviour: **reject this combination** with a clear parse error.

Reason: `--fail-on-finding` is stricter than targeted policy, so silently treating it as `"any"` could surprise callers
who believe they configured a targeted policy.

### Deprecation Warning Placement

Emit the deprecation warning only from `scripts/export-lessons-pdf.mjs`, not from `parseCliArgs()`.

Implementation options:

1. Have `parseCliArgs()` return metadata:

```ts
{
  options: PdfExportCliOptions,
  diagnostics: {
    usedDeprecatedFailOnFinding: boolean
  }
}
```

2. Or keep the parser return shape unchanged and let the CLI entrypoint inspect raw `argv`.

The first option is more testable and keeps the entrypoint from duplicating parser knowledge.

For the runtime warning, prefer `process.emitWarning()` with `type: "DeprecationWarning"` and a stable warning code,
because Node supports typed process warnings and identifies deprecation warnings with a `DeprecationWarning` type and
code. ([Node.js][1])

Example policy:

```ts
process.emitWarning(
    "--fail-on-finding is deprecated. Use --fail-on <findingKind> instead.",
    {
        type: "DeprecationWarning",
        code: "DIBS_PDF_EXPORT_FAIL_ON_FINDING_DEPRECATED",
    },
);
```

## Key Changes

### 1. Update `scripts/lib/pdf-export-cli.mjs`

Implement the new parser contract.

Required changes:

- Add repeatable `--fail-on <findingKind>`.
- Add `--fail-on=<findingKind>`.
- Validate every value using `normalizeExportFindingKind()`.
- Return normalized `LessonExportFindingKind` values only.
- Replace `failOnFinding: boolean` with `findingPolicy`.
- Map deprecated `--fail-on-finding` to `findingPolicy: { failOn: "any" }`.
- Reject unknown finding kinds with a clear error.
- Reject mixed usage of `--fail-on-finding` and `--fail-on`.
- Keep all existing route-selection conflict behaviour unchanged.

Recommended normalisation detail:

```ts
const findingPolicy = deprecatedFailOnFinding
    ? { failOn: "any" }
    : { failOn: normalizedFailOnKinds };
```

If duplicate targeted kinds are provided, deduplicate after normalization while preserving first-seen order:

```bash
--fail-on client-only --fail-on client-only-island
```

should produce:

```ts
{
    failOn: ["client-only-island"];
}
```

That makes the policy deterministic without changing the observable meaning.

### 2. Update `scripts/export-lessons-pdf.mjs`

Introduce a pure policy helper near the report handling code, or in a small script-local helper module if it is reused
by tests.

Suggested helper:

```ts
function hasFatalExportFindings(
    report: ExportReport,
    findingPolicy: FindingPolicy,
): boolean;
```

Expected behaviour:

- `failOn: []` returns `false`.
- `failOn: "any"` returns `report.summary.findings > 0`.
- Targeted policy checks every report finding.
- Finding matching supports both:

  - `{ kind: "..." }`
  - `{ code: "..." }`
- Finding matching normalizes legacy aliases before comparison.
- Unknown report finding codes do not match targeted policies.
- Existing generation-failure behaviour remains unchanged.

Preserve the current ordering:

1. Run export.
2. Collect findings and failures.
3. Write report.
4. Evaluate finding policy.
5. Set non-zero exit path if policy is fatal.
6. Still throw for generation failures after report writing, as today.

### 3. Keep Report Handling Minimal

Do only the compatibility work needed for matching.

Support both shapes:

```ts
{
    kind: "client-only-island";
}
{
    code: "client-only";
}
```

Do not change:

- report summary field names;
- finding collection logic;
- DOM finding shape;
- failed-entry shape;
- generation failure handling.

The DOM finding migration belongs to the later step that normalizes findings at the source.

## Tests

### Parser Tests

Extend `scripts/__tests__/pdf-export-cli.test.ts`.

Add tests for:

- default parse result:

```ts
findingPolicy: {
    failOn: [];
}
```

- single targeted policy:

```bash
--fail-on unresolved-todo
```

parses to:

```ts
{
    failOn: ["unresolved-todo"];
}
```

- equals form:

```bash
--fail-on=hidden-content
```

- repeated targeted policy preserves normalized order:

```bash
--fail-on hidden-content --fail-on unresolved-todo
```

- legacy alias normalization:

```bash
--fail-on=client-only
```

parses to:

```ts
{
    failOn: ["client-only-island"];
}
```

- duplicate normalization deduplicates deterministically:

```bash
--fail-on client-only --fail-on client-only-island
```

parses to:

```ts
{
    failOn: ["client-only-island"];
}
```

- invalid finding kind fails fast with a clear message;
- missing value after `--fail-on` fails fast with a clear message;
- `--fail-on-finding` maps to:

```ts
{
    failOn: "any";
}
```

- `--fail-on-finding --fail-on unresolved-todo` is rejected;
- existing selection conflict tests still pass.

### Entrypoint Warning Tests

Add a narrow test around the CLI entrypoint or warning helper, not the pure parser.

Cover:

- `--fail-on-finding` emits one deprecation warning.
- `--fail-on` does not emit a deprecation warning.
- Parser-only tests remain side-effect free.

Node’s `util.parseArgs()` documentation is useful as a reference point for keeping argument parsing structured rather
than manually coupling parsing with execution concerns; it supports declared option shapes and returns parsed values
separately from command execution. ([Node.js][2])

### Policy Tests

Add or extend script-local report policy tests.

Cover:

- empty policy does not fail on findings;
- `"any"` fails when `report.summary.findings > 0`;
- `"any"` does not fail when the summary has zero findings;
- targeted policy fails for configured kinds;
- targeted policy does not fail for unconfigured kinds;
- targeted policy supports `{ kind }`;
- targeted policy supports `{ code }`;
- targeted policy normalizes legacy `code: "client-only"` to `client-only-island`;
- unknown report finding codes do not accidentally match;
- malformed or missing finding identifiers are ignored for targeted policy;
- policy evaluation does not mutate the report.

## Suggested Implementation Order

1. **Add parser characterization tests for the new option shape.** Start with the default policy and one `--fail-on`
   case.

2. **Implement parser support for `--fail-on`.** Keep the implementation narrow and pure.

3. **Add validation and alias normalization tests.** Cover `client-only`, invalid kinds, missing values, and repeated
   flags.

4. **Add deprecated flag compatibility tests.** Confirm `--fail-on-finding` maps to `"any"`.

5. **Add conflict tests.** Reject `--fail-on-finding` combined with targeted `--fail-on`.

6. **Introduce `hasFatalExportFindings()`.** Test it independently from Playwright and filesystem concerns.

7. **Wire the policy into `export-lessons-pdf.mjs`.** Preserve report-writing order and existing generation-failure
   behaviour.

8. **Add deprecation warning emission at the entrypoint.** Keep the warning outside the pure parser.

9. **Run focused verification.**

```bash
pnpm test:unit -- scripts/__tests__/pdf-export-cli.test.ts scripts/__tests__/pdf-export-report.test.ts
pnpm run check:lesson-export-core
```

## Acceptance Criteria

This step is complete when:

- [x] `failOnFinding: boolean` is no longer part of the parsed CLI options.
- [x] `findingPolicy` is the only failure-policy field returned by the parser.
- [x] `--fail-on` accepts only known normalized finding kinds.
- [x] `--fail-on=...` and repeated `--fail-on ...` are supported.
- [x] `--fail-on-finding` still works as `"any"` for one transition cycle.
- [x] `--fail-on-finding` emits a deprecation warning only in the CLI entrypoint.
- [x] parser tests have no warning side effects.
- [x] targeted policy works with both `{ code }` and `{ kind }` findings.
- [x] `client-only` is normalized to `client-only-island` during policy matching.
- [x] unknown report finding codes do not accidentally become fatal under targeted policy.
- [x] report writing still happens before exit/failure policy decisions.
- [x] generation failures retain their current behaviour.

## Out of Scope

Do not do the following in this step:

- remove `--fail-on-finding`;
- redesign the report summary;
- rename report fields;
- migrate DOM findings from `{ code }` to `{ kind }`;
- change generation-failure semantics;
- add broad Playwright coverage;
- update the changelog unless explicitly requested.

[1]: https://nodejs.org/api/process.html?utm_source=chatgpt.com "Process | Node.js v26.1.0 Documentation"
[2]: https://nodejs.org/api/util.html?utm_source=chatgpt.com "Util | Node.js v26.1.0 Documentation"
