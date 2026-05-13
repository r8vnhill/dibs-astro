# [DONE] Step 3: Test Specifier Classification

## Status

Complete. `scripts/__tests__/layer-boundary-import-specifiers.test.ts` now pins unresolved import specifier
classification for local, alias-like, source-root-like, package-like, scoped package, Node built-in, and empty-string
specifier cases.

The focused test command currently reaches the expected red state for this stage because
`scripts/lib/layer-boundary-import-specifiers.mjs` has not been implemented yet.

## Summary

Add focused, helper-level characterization tests for unresolved import specifier classification in
`scripts/__tests__/layer-boundary-import-specifiers.test.ts`.

This step is intentionally **test-only**. It introduces the expected contract for `classifyUnresolvedImport()` before
implementing `scripts/lib/layer-boundary-import-specifiers.mjs`. The expected initial red state is that the module
cannot yet be resolved.

## Scope

### In scope

- Add a new focused test suite for `classifyUnresolvedImport()`.
- Pin how unresolved specifiers are classified before path resolution is available.
- Preserve the existing compatibility behaviour for empty specifiers.

### Out of scope

- Do not implement `scripts/lib/layer-boundary-import-specifiers.mjs`.
- Do not change existing layer-boundary classifier semantics.
- Do not introduce new public terminology or API shape.
- Do not address unrelated test failures from broader unit-test runs.

## Key Changes

### 1. Add tests for unresolved non-package specifiers

Add table-driven coverage asserting that unresolved local, alias-like, and source-root-like specifiers return:

```ts
{
    target: "unknown";
}
```

Cover these cases:

```ts
[
    ".",
    "..",
    "./local",
    "../shared",
    "~",
    "~/components/Button",
    "$content/course",
    "$generated",
    "/absolute/path",
    "src/domain/model",
    "src/components/Button",
];
```

These cases should remain classified as `unknown` because, without filesystem/path resolution, the helper must not guess
whether they belong to a project layer.

### 2. Add tests for package specifiers

Add table-driven coverage asserting that package-like specifiers return:

```ts
{
    target: "external-package", packageName;
}
```

Cover these cases:

```ts
[
    ["react", "react"],
    ["react/jsx-runtime", "react"],
    ["@scope/pkg", "@scope/pkg"],
    ["@scope/pkg/subpath", "@scope/pkg"],
    ["node:fs", "node:fs"],
];
```

This pins the package-name extraction contract, including scoped packages and Node built-in specifiers.

### 3. Preserve the empty-specifier compatibility quirk

Keep explicit coverage for the current edge case:

```ts
classifyUnresolvedImport("");
```

Expected result:

```ts
{ target: "external-package", packageName: "" }
```

This is a compatibility pin, not a recommendation for future API design. Any later cleanup should happen in a separate
migration step with its own test update.

## Suggested Test Structure

Use one `describe("classifyUnresolvedImport", ...)` block with three small groups:

```ts
describe("classifyUnresolvedImport", () => {
    it.each(nonPackageSpecifiers)(
        "classifies unresolved non-package specifier %j as unknown",
        (specifier) => {
            expect(classifyUnresolvedImport(specifier)).toStrictEqual({
                target: "unknown",
            });
        },
    );

    it.each(packageSpecifiers)(
        "extracts package name from %j",
        (specifier, packageName) => {
            expect(classifyUnresolvedImport(specifier)).toStrictEqual({
                target: "external-package",
                packageName,
            });
        },
    );

    it("preserves the empty specifier compatibility behavior", () => {
        expect(classifyUnresolvedImport("")).toStrictEqual({
            target: "external-package",
            packageName: "",
        });
    });
});
```

## Test Plan

Run the focused suite:

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-import-specifiers.test.ts
```

Expected result before implementation:

```text
scripts/lib/layer-boundary-import-specifiers.mjs cannot be resolved
```

After Step 4 implements the helper, this same suite should become the focused green target.

## Notes

- The broader `pnpm test:unit -- ...` command may still run additional unit tests depending on the repo’s test runner
  configuration.
- The previously observed timeout in `scripts/__tests__/bibliography-public-facades.test.ts` should remain outside this
  step unless it also reproduces during the focused specifier-classification workflow after implementation.
- This step follows the current architecture-checker refactor style: first pin the helper contract, then implement the
  helper in the next cycle.
