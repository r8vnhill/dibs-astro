# [PLAN] Migrate `HeadingLevel` to `@ravenhill/html-core`

## Summary

Extract `HeadingLevel` into a new private workspace package, `@ravenhill/html-core`, because heading levels are reusable
HTML semantics rather than content, site, syntax-highlighting, or lesson-export concerns.

The migration should be behavior-preserving: existing components should render the same HTML before and after the import
source changes. The only intended architectural change is ownership of the shared semantic primitive.

---

## Phase 1 — Introduce the `html-core` Package Contract [DONE]

### Goal

Create `@ravenhill/html-core` as a small, host-agnostic package with a minimal root-only public API.

### Scope

Add:

- `packages/html-core/package.json`
- `packages/html-core/tsconfig.json`
- `packages/html-core/tsup.config.ts`
- `packages/html-core/vitest.config.ts`
- `packages/html-core/src/index.ts`
- `packages/html-core/README.md`
- `packages/html-core/AGENTS.md`

Export only:

```ts
export const HTML_CORE_PACKAGE_NAME = "@ravenhill/html-core";
export const HTML_CORE_VERSION = "...";

export type HeadingLevel =
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "h5"
    | "h6";
```

Use package `exports` to expose only the root entry point:

```json
{
    "name": "@ravenhill/html-core",
    "private": true,
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "default": "./dist/index.js"
        }
    }
}
```

This keeps subpath imports out of the public contract.

### TDD Cycles

#### Cycle 1 — Package identity constants

**Red**

Add runtime tests:

```ts
describe("@ravenhill/html-core identity", () => {
    it("exposes the package name", () => {
        expect(HTML_CORE_PACKAGE_NAME).toBe("@ravenhill/html-core");
    });

    it("exposes the package version", () => {
        expect(HTML_CORE_VERSION).toBeDefined();
    });
});
```

**Green**

Add constants to `src/index.ts`.

**Refactor**

If other packages already derive version constants from `package.json`, follow that pattern. Otherwise, keep the
implementation simple and document the maintenance tradeoff.

#### Cycle 2 — `HeadingLevel` type contract

**Red**

Add a type test such as `heading-level.test-d.ts`:

```ts
import { assertType, expectTypeOf } from "vitest";
import type { HeadingLevel } from "../src";

const validHeadingLevels = [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
] as const;

validHeadingLevels.forEach((level) => {
    assertType<HeadingLevel>(level);
});

expectTypeOf<"h7">().not.toExtend<HeadingLevel>();
expectTypeOf<"section">().not.toExtend<HeadingLevel>();
expectTypeOf<"H1">().not.toExtend<HeadingLevel>();
```

**Green**

Export the union type.

**Refactor**

Keep the type local to the root entry point unless future HTML primitives justify internal files.

#### Cycle 3 — Root-only API

**Red**

Add a consumer check proving that root imports work and subpath imports fail.

BDD-style expectations:

- `it("allows importing HeadingLevel from @ravenhill/html-core")`
- `it("rejects importing HeadingLevel from @ravenhill/html-core/heading-level")`

**Green**

Configure `exports` correctly.

**Refactor**

Prefer a tiny `consumer:check` fixture or script over brittle tests that inspect package internals.

### Acceptance Criteria

- `pnpm --filter @ravenhill/html-core build` passes.
- `pnpm --filter @ravenhill/html-core check` passes.
- Type tests cover all valid heading levels and representative invalid strings.
- Subpath imports are rejected by the consumer check.
- The package imports no Astro, UI, site, generated-data, lesson-export, or app-local alias modules.

### Non-goals

- Do not move unrelated HTML utilities.
- Do not introduce runtime validation for heading levels.
- Do not add DOM, Astro, or browser-specific behavior.
- Do not publish the package externally.

### Suggested Execution Order

1. Scaffold the package from the nearest existing workspace package pattern.
2. Add root API tests.
3. Add type tests.
4. Add package `exports`.
5. Add consumer import checks.
6. Run focused package validation.

---

## Phase 2 — Wire the Package into the Workspace [DONE]

### Goal

Make `@ravenhill/html-core` available to the monorepo without changing production behavior.

### Scope

Update workspace and root automation:

- Ensure `packages/html-core` is included by the workspace configuration.
- Add package scripts:

  - `build`
  - `check`
  - `pack:check`
  - `consumer:check`
- Add root scripts:

  - `build:html-core`
  - `check:html-core`
- Add `build:html-core` to:

  - `predev`
  - `prebuild`
  - `predeploy`
- Add `check:html-core` to root `check` before Astro and architecture checks.

pnpm workspaces are designed for multi-package repositories, and the `workspace:` protocol is the right way to require a
local workspace package instead of accidentally resolving an external package. ([pnpm][3])

### TDD Cycles

#### Cycle 1 — Workspace discoverability

**Red**

Run:

```bash
pnpm --filter @ravenhill/html-core check
```

It should fail before the package is correctly registered or installed.

**Green**

Add the package to the workspace structure and install/update lockfile as needed.

**Refactor**

Use the same script naming and filtering conventions as nearby packages.

#### Cycle 2 — Root script integration

**Red**

Run:

```bash
pnpm check:html-core
```

**Green**

Add the root script.

**Refactor**

Keep root scripts thin, preferably delegating to package-level scripts with `pnpm --filter`.

### Acceptance Criteria

- `pnpm check:html-core` passes.
- `pnpm build:html-core` passes.
- `pnpm check` includes `check:html-core` before consumers that may import the package.
- Lockfile changes are limited to the new workspace dependency wiring.

### Completion Notes

- `packages/html-core` is included through the existing `packages/*` workspace pattern.
- Root scripts now expose `build:html-core` and `check:html-core`.
- `build:html-core` runs in `predev`, `prebuild`, and `predeploy`.
- Root `check` runs `check:html-core` before Astro checks and architecture checks.
- The root app declares `@ravenhill/html-core` with the `workspace:*` protocol so later direct consumers resolve the
  local package.
- Validation passed with `pnpm check:html-core` and `pnpm build:html-core`.

### Non-goals

- Do not alter unrelated package scripts.
- Do not change global check semantics except adding the new package gate.
- Do not introduce new build tooling unless existing package patterns require it.

### Suggested Execution Order

1. Register the package in the workspace.
2. Add root scripts.
3. Add package-level scripts.
4. Run focused validation.
5. Run root-level validation only after consumers migrate.

---

## Phase 3 — Migrate Direct Consumers

### Goal

Move direct consumers from the local utility type to `@ravenhill/html-core`.

### Scope

Update imports in:

- semantic heading component
- callout shared props
- callout heading component

Also add `@ravenhill/html-core: workspace:*` to the dependency list of each package that imports it directly.

### TDD Cycles

#### Cycle 1 — Semantic heading consumer

**Red**

Update the semantic heading component test expectation to describe behavior, not implementation:

- `it("renders the requested semantic heading level")`
- DDT matrix: `h1` through `h6`

**Green**

Change the import source to `@ravenhill/html-core`.

**Refactor**

Keep rendering code unchanged.

#### Cycle 2 — Callout props and heading consumer

**Red**

Add or confirm tests:

- `it("passes the configured heading level to the callout heading")`
- `it("preserves existing callout heading markup")`

**Green**

Change imports in shared props and heading component.

**Refactor**

Remove duplicate local type imports, but do not remove the compatibility bridge yet.

### Acceptance Criteria

- All listed consumers import `HeadingLevel` from `@ravenhill/html-core`.
- Rendered HTML remains unchanged.
- Consumer packages declare the dependency explicitly.
- Existing callout and semantic heading tests pass.
- No consumer imports from `@ravenhill/html-core` subpaths.

### Non-goals

- Do not redesign heading rendering.
- Do not change default heading levels.
- Do not alter callout semantics, classes, slots, or generated markup.
- Do not remove `~/utils` compatibility yet.

### Suggested Execution Order

1. Migrate the semantic heading component first.
2. Migrate callout shared props.
3. Migrate callout heading.
4. Run focused Astro/component tests.
5. Run architecture checks.

---

## Phase 4 — Keep a Temporary Compatibility Bridge

### Goal

Preserve compatibility for any remaining `~/utils` consumers while making the migration direction explicit.

### Scope

Keep or replace `src/utils/heading-level.ts` with a compatibility re-export:

```ts
/**
 * Compatibility bridge for legacy local imports.
 *
 * Prefer importing [HeadingLevel] from `@ravenhill/html-core`.
 * This bridge exists only to keep older local imports working during
 * the migration.
 */
export type { HeadingLevel } from "@ravenhill/html-core";
```

### TDD Cycles

#### Cycle 1 — Bridge compatibility

**Red**

Add or keep a type-level smoke test proving the bridge still exposes `HeadingLevel`.

**Green**

Implement the re-export.

**Refactor**

Mark the bridge as deprecated in documentation, but avoid runtime warnings because this is a type-only compatibility
path.

### Acceptance Criteria

- Existing legacy imports still typecheck.
- New or touched code imports from `@ravenhill/html-core`.
- Documentation clearly marks the bridge as temporary.
- Architecture checks either allow the bridge explicitly or flag only new direct imports.

### Non-goals

- Do not keep the bridge indefinitely.
- Do not expose additional local utility APIs through the bridge.
- Do not add runtime compatibility code.

### Suggested Execution Order

1. Add the bridge after the package exists.
2. Migrate known consumers.
3. Search for remaining legacy imports.
4. Keep the bridge only if at least one transitional consumer still needs it.

---

## Phase 5 — Remove the Legacy Utility After Consumers Are Clean

### Goal

Delete the old local utility once the new package is the only source of truth.

### Scope

Remove:

- `src/utils/heading-level.ts`

Update:

- any barrel exports that still expose the old path
- any docs referring to the legacy utility path
- any architecture allowlist added only for the bridge

### TDD Cycles

#### Cycle 1 — Legacy path removal

**Red**

Add or update an architecture test:

- `it("does not import HeadingLevel from the legacy utils path")`

**Green**

Remove all remaining legacy imports and delete the file.

**Refactor**

Remove bridge-specific comments, allowlist entries, and stale docs.

### Acceptance Criteria

- No imports reference `src/utils/heading-level`.
- No imports reference `~/utils/heading-level`.
- `HeadingLevel` is imported only from `@ravenhill/html-core`.
- `pnpm check:html-core` passes.
- `pnpm check:architecture` passes.
- `pnpm check` passes.

### Non-goals

- Do not remove unrelated utilities from `~/utils`.
- Do not expand `html-core` beyond `HeadingLevel` and identity constants in this migration.
- Do not change generated HTML or public component behavior.

### Suggested Execution Order

1. Search for legacy imports.
2. Add or update architecture guard.
3. Delete the legacy utility.
4. Remove compatibility documentation.
5. Run full validation.

---

## Final Validation Plan

Run focused checks first:

```bash
pnpm check:html-core
pnpm build:html-core
pnpm check:architecture
```

Then run consumer checks:

```bash
pnpm test:astro -- src/components/ui/callouts src/components/semantics
```

Finally run the full gate:

```bash
pnpm check
```

---

## Deferred Items

- Adding more HTML semantic primitives.
- Runtime validators such as `isHeadingLevel`.
- Public package publication.
- Changelog entry, unless the repository convention requires one for internal package moves.
- Broader cleanup of `~/utils`.

---

## References

- Node.js package `exports` documentation, especially subpath encapsulation. ([Node.js][1])
- TypeScript module resolution behavior for package `exports`. ([TypeScript][4])
- TypeScript project references as a monorepo boundary mechanism. ([TypeScript][5])
- Vitest type testing with `expectTypeOf` and `assertType`. ([Vitest][2])
- pnpm workspace and `workspace:` protocol documentation. ([pnpm][3])

[1]: https://nodejs.org/api/packages.html?utm_source=chatgpt.com "Modules: Packages | Node.js v26.3.0 Documentation"
[2]: https://vitest.dev/guide/testing-types?utm_source=chatgpt.com "Testing Types | Guide"
[3]: https://pnpm.io/workspaces?utm_source=chatgpt.com "Workspace"
[4]: https://www.typescriptlang.org/docs/handbook/modules/reference.html?utm_source=chatgpt.com "Documentation - Modules - Reference"
[5]: https://www.typescriptlang.org/docs/handbook/project-references.html?utm_source=chatgpt.com "Project References - TypeScript: Documentation"
