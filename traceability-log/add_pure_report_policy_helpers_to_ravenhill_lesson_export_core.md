# [PLAN] Add pure report/policy helpers to `@ravenhill/lesson-export-core`

## Summary

Extract only the pure reporting and fatal-policy decision logic into `@ravenhill/lesson-export-core`.

The package should own deterministic export-domain behaviour: summary construction, finding aggregation, normalized
finding-kind matching, and fatal-policy evaluation. The script layer should remain the host adapter for filesystem
writes, Playwright/page-derived data, CLI parsing, process exit behaviour, and report file assembly.

This keeps the package boundary clean: Playwright remains browser automation infrastructure, not domain logic, and
package consumers continue importing from the root entry point only. Playwright’s own documentation frames it as browser
automation for tests and scripts, which supports keeping it outside the pure export-core package. ([Playwright][1])
Node’s package documentation also recommends the `exports` field for controlling public entry points, which supports
preserving the existing root-only public API discipline. ([Node.js][2])

## Design Rule

A helper may move into `@ravenhill/lesson-export-core` only if it is:

- deterministic;
- data-in/data-out;
- independent of filesystem APIs;
- independent of Playwright, DOM, browser page objects, and preview-server state;
- independent of CLI/process state;
- independent of generated Astro module imports;
- expressible through existing export-core types and finding kinds.

A helper stays in `scripts/` if it touches:

- `fs`;
- `path`;
- `process`;
- console output;
- Playwright;
- browser page results;
- generated lesson metadata;
- CLI argument shape;
- preview-server lifecycle;
- report file writing.

## Step 1: Lock the current core reporting contract

**File**

```text
packages/lesson-export-core/tests/reporting.test.ts
```

**Depends on:** none.

Before adding helpers, make the pure contract explicit.

Keep the existing summary/count tests and add or clarify cases for:

- zero-value summary contract;
- mixed exported, failed, skipped, and finding-bearing entries;
- `findingsByKind`;
- `failuresByKind`;
- normalized finding kinds;
- legacy aliases such as `client-only -> client-only-island`;
- unsupported finding kinds, if the current normalizer already accepts or preserves them;
- input immutability for `buildExportSummary()`.

Also add the failure-policy cases currently covered only in the script adapter:

```ts
failOn: [];
failOn: "any";
failOn: ["client-only"];
failOn: ["client-only-island"];
failOn: ["some-targeted-kind"];
```

Use names inspired by Kazuki Takahashi’s work for fake routes or titles, for example:

```ts
"/exports/pdf/notes/duel-monsters/card-catalog/";
"Millennium Puzzle Catalog";
"KaibaCorp Export Smoke";
```

Keep the assertions focused on current behaviour, not future cleanup.

## Step 2: Introduce a pure fatal-policy helper

**File**

```text
packages/lesson-export-core/src/reporting.ts
```

**Depends on:** Step 1.

Add one dedicated helper that evaluates whether findings should be treated as fatal under a given policy.

The helper should reuse the existing normalization path from:

```text
packages/lesson-export-core/src/findings.ts
```

Recommended shape:

```ts
export function hasFatalExportFindings(
    findings: readonly ExportFinding[],
    failOn: ExportFailurePolicy,
): boolean;
```

Or, if the existing script policy depends on both entry errors and entry findings

[1]: https://playwright.dev/?utm_source=chatgpt.com "Playwright: Fast and reliable end-to-end testing for modern ..."
[2]: https://nodejs.org/api/packages.html?utm_source=chatgpt.com "Modules: Packages | Node.js v26.1.0 Documentation"
