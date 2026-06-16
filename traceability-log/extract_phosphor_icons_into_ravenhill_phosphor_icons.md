# [PLAN] Extract Phosphor Icons into `@ravenhill/phosphor-icons`

## Key improvements over the original plan

1. **Add a characterization phase before moving files.** Capture the current icon count, barrel export count, and one or
   two representative consumers before migration. This prevents silent regressions in generated names, alias resolution,
   or render behavior.

2. **Make the package contract explicit.** The new package should define `exports`, `types`, `files`, and package
   validation rules, not only `scripts`. `publint` is a good fit because it checks package compatibility and common npm
   packaging mistakes, and its docs explicitly recommend building before linting packages with build steps.
   ([publint.dev][2])

3. **Separate package verification from Astro verification.** The package can verify build, type declarations, tarball
   contents, and SVG parity. The Astro app must verify actual SVG-component consumption because Astro’s SVG handling is
   pipeline-specific. ([docs.astro.build][1])

4. **Prefer `pnpm --filter` for package commands.** Use the package name selector consistently once the package exists.
   pnpm supports selecting workspaces by exact package name with `--filter <package_name>`. ([pnpm][3])

5. **Do not overuse PBT.** Property-based testing adds little here because the main risks are deterministic
   file-system/package invariants. Use **BDD-style assertions** and **DDT matrices** for packaging rules instead.

---

# ~~Phase 0: Characterize Current Icon Contract~~

**Status**: ✅ Complete — see [phase-0-characterization.md](phase-0-characterization.md)

## Summary

Baseline documented on 2026-06-16:
- **Current SVG count**: 1,521
- **Current barrel exports**: 1,521 (parity confirmed)
- **Barrel location**: `src/assets/img/icons/index.ts`
- **Representative consumers**: 83 files identified, with `shared.ts` (callout icons) as the critical integration point
- **Baseline validation**: ✅ `pnpm generate-icons` passes

See [phase-0-characterization.md](phase-0-characterization.md) for full details.

---

## Goal

Record the existing behavior before extraction so the migration can prove that it preserves the public icon contract.

## Scope

Include:

- Current SVG count in `src/assets/img/icons/*.svg`.
- Current generated barrel location.
- Current `$icons` alias target.
- A small list of representative `$icons` consumers, especially callout/icon components.
- Current successful validation command, preferably the narrowest existing Astro check.

## Red

Add or document failing characterization checks such as:

```text
Given the current icon asset directory
When the icon generator runs
Then the generated barrel exports one symbol per SVG file

Given an Astro component imports from $icons
When the app type-checks or builds
Then the import resolves without changing consumer code
```

A lightweight script-based check is enough; do not add a full test framework unless the repo already has one for this
layer.

## Green

Run the current generator and validation flow without changing paths yet.

Suggested commands:

```sh
pnpm generate-icons
pnpm build
```

Or, if available, use the repo’s focused Astro validation command before `pnpm build`.

## Refactor

Document the baseline counts and representative consumers in the traceability log or implementation notes.

## Acceptance criteria

- Current SVG count is known.
- Current barrel export count is known.
- At least one `$icons` consumer is identified.
- Baseline validation passes before any move.

## Non-goals

- Do not create the new package yet.
- Do not update aliases yet.
- Do not change generated icon names.

## Suggested execution order

Run this first. It protects the rest of the migration from becoming a blind file move.

---

# ~~Phase 1: Create the Package Boundary~~

**Status**: ✅ Complete — see [phase-1-scaffold.md](phase-1-scaffold.md)

## Summary

Package scaffolding complete on 2026-06-16:
- Created `packages/phosphor-icons/` with 9 files
- Package metadata follows `shiki-core` conventions
- Build pipeline configured: `tsup` (external SVGs) + `copy-assets.mjs` (post-build)
- Validation scripts in place: `assert-pack-files.mjs` (pattern-based)
- TypeScript typecheck: ✅ Pass
- No SVGs moved; no Astro app changes; full rollback possible

See [phase-1-scaffold.md](phase-1-scaffold.md) for detailed implementation.  
See [PHASE_1_COMPLETION.md](PHASE_1_COMPLETION.md) for sign-off.

---

## Goal

Introduce `packages/phosphor-icons` as a valid first-party workspace package without moving the existing app assets yet.

## Scope

Create:

```text
packages/phosphor-icons/
  AGENTS.md
  README.md
  package.json
  tsconfig.json
  tsup.config.ts
  src/svg.d.ts
  scripts/copy-assets.mjs
  scripts/assert-pack-files.mjs
```

For `package.json`, include the original proposed fields, plus an explicit package surface:

```json
{
    "name": "@ravenhill/phosphor-icons",
    "version": "0.1.0",
    "description": "Phosphor icon SVG assets for Ravenhill projects.",
    "type": "module",
    "sideEffects": false,
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "default": "./dist/index.js"
        }
    },
    "types": "./dist/index.d.ts",
    "files": [
        "dist",
        "README.md"
    ]
}
```

Use the same `publishConfig` conventions as the existing first-party packages.

## Red

Create package-contract checks before the package fully builds:

```text
Given @ravenhill/phosphor-icons is packed
When the tarball contents are inspected
Then dist/index.js, dist/index.d.ts, dist/index.js.map, package.json, and README.md are present

Given @ravenhill/phosphor-icons is packed
When the tarball contents are inspected
Then source files, scripts, tsup config, and AGENTS.md are not included
```

## Green

Implement the package files and scripts.

For `tsup.config.ts`, keep SVG imports externalized so emitted JS preserves relative `.svg` references:

```ts
import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    minify: false,
    target: "es2022",
    outDir: "dist",
    external: [/\.svg$/],
});
```

Keep `src/svg.d.ts`, but consider using Astro’s public SVG type if the installed Astro version supports it:

```ts
declare module "*.svg" {
    const Component: import("astro").AstroComponentFactory;
    export default Component;
}
```

or, if compatible with the project’s Astro version:

```ts
declare module "*.svg" {
    const Component: import("astro/types").SvgComponent;
    export default Component;
}
```

Astro documents `SvgComponent` as available from `astro/types` in newer versions, so this is worth checking against the
installed version before choosing. ([docs.astro.build][1])

## Refactor

Deduplicate `assert-pack-files.mjs` helpers only if the repo already has a shared script helper location. Otherwise,
copy from `shiki-core` for consistency and defer centralization.

## Acceptance criteria

- Package exists and is discoverable by the workspace.
- Package metadata follows existing first-party package conventions.
- `package.json` defines `exports`, `types`, and `files`.
- `pack:check` logic is present but may not pass until assets move.
- No Astro app behavior has changed yet.

## Non-goals

- Do not move SVGs in this phase.
- Do not update `$icons` yet.
- Do not publish the package.

## Suggested execution order

Do this after baseline characterization and before moving files, so package scaffolding errors are isolated from asset
migration errors.

---

# Phase 2: Move Assets and Regenerate the Barrel

## Goal

Move icon ownership from the Astro app source tree into the new package while preserving the generated export contract.

## Scope

Move:

```text
src/assets/img/icons/*.svg
```

to:

```text
packages/phosphor-icons/src/*.svg
```

Do not manually preserve the old `src/assets/img/icons/index.ts`; regenerate the barrel into the new package.

Update:

```js
// generate-icons-index.js
icons: path.resolve("packages/phosphor-icons/src");
```

Update:

```ts
// config/integrations/generate-icons.ts
const ICONS_DIR = path.resolve(
    fileURLToPath(new URL("../../packages/phosphor-icons/src", import.meta.url)),
);
```

## Red

Use DDT for generator path behavior:

| Case              | Given                                       | When                       | Then                                                |
| ----------------- | ------------------------------------------- | -------------------------- | --------------------------------------------------- |
| Package icons     | SVGs exist in `packages/phosphor-icons/src` | `pnpm generate-icons` runs | `packages/phosphor-icons/src/index.ts` is generated |
| Removed app icons | Old app icon directory is absent or empty   | integration generator runs | it does not recreate the old icon barrel            |
| Count parity      | `N` SVGs exist in package source            | barrel is generated        | barrel has `N` exports                              |

## Green

Move files, run the generator, and inspect the generated barrel.

Suggested commands:

```sh
pnpm generate-icons
```

Optional check:

```sh
find packages/phosphor-icons/src -name "*.svg" | wc -l
```

On PowerShell:

```powershell
(Get-ChildItem packages/phosphor-icons/src -Filter *.svg).Count
```

## Refactor

Delete the old `src/assets/img/icons/` directory only after all aliases and generator paths are updated.

## Acceptance criteria

- All SVGs live under `packages/phosphor-icons/src`.
- `packages/phosphor-icons/src/index.ts` is generated.
- Generated export count matches SVG count.
- The old app icon directory is no longer used.
- Icon export names remain stable.

## Non-goals

- Do not rename SVG files.
- Do not normalize SVG contents.
- Do not optimize or minify SVGs.
- Do not introduce an icon component abstraction.

## Suggested execution order

Move assets first, then update generator paths, then regenerate. Avoid changing app aliases until the package source
barrel exists.

---

# Phase 3: Wire the Astro App to the Package Source

## Goal

Make existing `$icons` consumers resolve through the new package source while preserving Astro’s SVG-component pipeline.

## Scope

Update root `tsconfig.json`:

```json
"$icons": ["./packages/phosphor-icons/src/index.ts"]
```

Add the workspace dependency:

```json
"@ravenhill/phosphor-icons": "workspace:*"
```

Add root check script:

```json
"check:phosphor-icons": "pnpm --filter @ravenhill/phosphor-icons run check"
```

Prefer `pnpm --filter @ravenhill/phosphor-icons ...` over `pnpm --dir ...` once the package is part of the workspace,
because the selector follows the package contract rather than the folder layout. pnpm documents package-name filtering
as a first-class workspace selector. ([pnpm][3])

## Red

BDD-style checks:

```text
Given an existing Astro component imports icons from $icons
When TypeScript resolves the import
Then it resolves to packages/phosphor-icons/src/index.ts

Given an Astro page renders a component using $icons
When the Astro dev server or production build runs
Then the SVG is rendered through Astro's SVG component pipeline
```

## Green

Update the alias and root dependency, then run the narrowest validation that checks import resolution.

Suggested commands:

```sh
pnpm install
pnpm generate-icons
pnpm build
```

If the repo has a focused Astro check, run it before the full build.

## Refactor

Replace any remaining direct imports from `src/assets/img/icons` with `$icons`.

Optional but useful:

```sh
rg "src/assets/img/icons|assets/img/icons"
```

## Acceptance criteria

- `$icons` points at `packages/phosphor-icons/src/index.ts`.
- No production code imports from the old app icon directory.
- Existing components compile without import changes.
- Astro dev and production builds still render icons.

## Non-goals

- Do not switch Astro app consumption to `dist`.
- Do not require non-Astro consumers to render SVGs.
- Do not replace `$icons` with direct package imports yet.

## Suggested execution order

Do this after Phase 2. The alias should only change once the package source barrel exists.

---

# Phase 4: Validate Package Build and Published Shape

## Goal

Ensure `@ravenhill/phosphor-icons` can be built and packed independently without leaking source files or losing SVG
assets.

## Scope

Validate:

- `tsup` emits `dist/index.js`, `dist/index.d.ts`, and source map.
- SVG files are copied to `dist`.
- `dist/index.js` keeps relative `.svg` re-exports.
- tarball includes all required publish files.
- tarball excludes blocked development files.
- source SVG count equals packed/dist SVG count.

## Red

Use a DDT matrix for tarball assertions:

| Rule            | Required behavior                                                                           |
| --------------- | ------------------------------------------------------------------------------------------- |
| Required files  | `README.md`, `package.json`, `dist/index.js`, `dist/index.d.ts`, `dist/index.js.map` exist  |
| Asset parity    | packed `dist/*.svg` count equals source `src/*.svg` count                                   |
| No source leak  | `src/` is absent from the packed package                                                    |
| No scripts leak | `scripts/` is absent from the packed package                                                |
| No config leak  | `tsup.config.ts`, `tsconfig.json`, and `AGENTS.md` are absent unless intentionally included |

## Green

Run:

```sh
pnpm --filter @ravenhill/phosphor-icons build
pnpm --filter @ravenhill/phosphor-icons typecheck
pnpm --filter @ravenhill/phosphor-icons lint
pnpm --filter @ravenhill/phosphor-icons pack:check
```

Keep `publint` after build, because its documentation notes that packages with build steps must be built first.
([publint.dev][2])

## Refactor

If multiple packages now duplicate tarball helper logic, consider a later shared `scripts/package-contract` helper. Do
not block this migration on that refactor.

## Acceptance criteria

- Package check passes.
- `dist/*.svg` count equals `src/*.svg` count.
- `dist/index.js` contains relative SVG exports.
- Packed tarball contains only intended publish files.
- `publint` passes.

## Non-goals

- Do not add Node.js runtime tests for SVG rendering.
- Do not attempt to make SVG imports executable in plain Node.js.
- Do not add Vitest or fast-check for this package.

## Suggested execution order

Run package checks before full Astro checks. This isolates package-shape failures from app integration failures.

---

# Phase 5: Validate End-to-End Astro Integration

## Goal

Prove that the extracted package preserves the Astro app’s runtime and build behavior.

## Scope

Validate:

- icon generation hook still watches the new package source directory;
- `$icons` resolves in development;
- production build succeeds;
- representative pages render icons.

## Red

BDD-style integration checks:

```text
Given the Astro app imports icons through $icons
When the dev server starts
Then the integration reports the icon index is up to date

Given a page renders callout components
When the page is built
Then the expected SVG output is present

Given the app production build runs
When Vite follows SVG imports from the package source
Then the build completes without SVG loader errors
```

## Green

Run:

```sh
pnpm generate-icons
pnpm dev
pnpm build
```

For CI or non-interactive validation, prefer a focused build/check command over manual browser verification.

## Refactor

Add a short note to the package README explaining the consumption model:

- source alias is used by the Astro app;
- `dist` exists for publication;
- consumers must have an SVG pipeline compatible with Astro SVG components.

## Acceptance criteria

- Astro dev server starts.
- Icon generation integration watches the new directory.
- Representative icon consumers render correctly.
- Production build passes.
- No references remain to the old app icon directory.

## Non-goals

- Do not add a separate demo app.
- Do not change icon visual output.
- Do not change callout/component APIs.

## Suggested execution order

Run after package-level validation. This is the final behavior-preservation gate.

---

# Suggested final command sequence

```sh
pnpm generate-icons
pnpm --filter @ravenhill/phosphor-icons build
pnpm --filter @ravenhill/phosphor-icons typecheck
pnpm --filter @ravenhill/phosphor-icons lint
pnpm --filter @ravenhill/phosphor-icons pack:check
pnpm build
```

Optional manual check:

```sh
pnpm dev
```

Then open one page that uses `$icons`, especially a callout-heavy page.

---

# Final acceptance criteria

The migration is complete when:

- `packages/phosphor-icons` exists as `@ravenhill/phosphor-icons`.
- All Phosphor SVG files live in `packages/phosphor-icons/src`.
- `packages/phosphor-icons/src/index.ts` is generated by the existing icon generator.
- Root `$icons` resolves to `packages/phosphor-icons/src/index.ts`.
- The package builds to `dist`.
- `dist` includes one copied SVG per source SVG.
- packed package contents are validated.
- `publint` passes after build.
- Astro development and production builds still process SVG icons correctly.
- no production code imports from `src/assets/img/icons`.

This structure keeps the work behavior-preserving, testable, and modular without inflating it into a milestone-level
migration.

[1]: https://docs.astro.build/en/guides/images/ "Images | Docs"
[2]: https://publint.dev/docs/ "Getting started | publint"
[3]: https://pnpm.io/filtering "Filtering | pnpm"
