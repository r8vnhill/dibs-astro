# [PLAN] Promote `@ravenhill/phosphor-icons` to Standalone `@ravenhill/astro-icons`

## Phase 0: Freeze the Source Contract

### Goal

Capture the existing icon inventory and public export contract before moving to the standalone repository.

### Scope

- Count current Phosphor SVGs.
- Identify custom/non-Phosphor SVGs.
- Capture current generated export names.
- Record package name transition:

  - from `@ravenhill/phosphor-icons`
  - to `@ravenhill/astro-icons`
- Confirm that updating `astro-website` to consume the published package remains out of scope.

### Red

BDD-style characterization checks:

```text
Given the monorepo package contains the current icon set
When the source inventory is inspected
Then every SVG is classified as either phosphor or custom

Given the current generated barrel exists
When export names are extracted
Then the standalone package can preserve those names or document intentional namespace changes
```

### Green

Create a migration inventory file, for example:

```text
migration/icon-inventory.json
```

Suggested shape:

```json
{
    "phosphor": {
        "count": 1521,
        "sourceDirectory": "src/phosphor"
    },
    "custom": {
        "files": [
            "bash.svg",
            "csv.svg",
            "json.svg",
            "kotlin.svg",
            "nushell-logo.svg",
            "powershell.svg",
            "python.svg",
            "scala.svg",
            "xml.svg"
        ],
        "sourceDirectory": "src/custom"
    }
}
```

### Refactor

If the inventory script is useful, keep it as `scripts/audit-icons.ts`; otherwise keep the inventory as a one-time
migration artifact.

### Acceptance criteria

- Every SVG is classified.
- Current export names are captured.
- Custom icons are explicitly separated from Phosphor icons.
- No files are moved yet.

### Non-goals

- Do not create the GitLab repository yet.
- Do not publish anything.
- Do not update `astro-website`.

### Suggested execution order

Run this first. It reduces the main migration risk: silently changing icon names or mixing license domains.

---

## Phase 1: Verify Licensing and Attribution

### Goal

Make redistribution legally explicit before publishing a standalone package.

### Scope

Create:

```text
LICENSE
LICENSES/PHOSPHOR.txt
LICENSES/THIRD_PARTY.md
```

The package-level `LICENSE` can be MIT for original package code, but `LICENSES/THIRD_PARTY.md` must be verified icon by
icon. The uploaded plan already identifies the need for a Phosphor MIT license and attribution for custom icons.

### Red

BDD-style checks:

```text
Given an SVG is included in src/phosphor
When licensing metadata is checked
Then it is covered by the Phosphor MIT license

Given an SVG is included in src/custom
When licensing metadata is checked
Then THIRD_PARTY.md lists its origin, license, and redistribution notes
```

DDT matrix:

| Icon group             | Required metadata                                                  |
| ---------------------- | ------------------------------------------------------------------ |
| Phosphor               | upstream project, upstream license, copied license text            |
| Custom Ravenhill icons | author/owner, package license coverage                             |
| Third-party logos      | origin, license, trademark note if relevant, redistribution status |

### Green

Add license files and fill `THIRD_PARTY.md` only with verified information.

Recommended correction to the original plan: do **not** state that only the Phosphor license header is needed. For MIT
redistribution, include the actual license text and copyright notice.

### Refactor

If any custom icon has unclear licensing, move it to a deferred list and exclude it from `src/custom` until verified.

### Acceptance criteria

- `LICENSE` exists for package code.
- `LICENSES/PHOSPHOR.txt` contains the Phosphor license text.
- `LICENSES/THIRD_PARTY.md` contains verified entries for every custom icon.
- No icon with uncertain redistribution rights is included in the publishable package.

### Non-goals

- Do not redesign or redraw icons.
- Do not resolve trademark policy beyond documenting attribution and usage notes.

### Suggested execution order

Do this before repository publication and before the first package release.

---

## Phase 2: Create the Standalone Repository Skeleton

### Goal

Create a standalone GitLab project with a minimal, reproducible Bun-based package layout.

### Scope

Create the repository:

```sh
glab repo create r8vnhill/astro-icons --private --description "Astro SVG icon components — Phosphor icons + custom icons"
```

Create the file structure:

```text
astro-icons/
├── .gitignore
├── .gitlab-ci.yml
├── .npmrc
├── CHANGELOG.md
├── LICENSE
├── LICENSES/
│   ├── PHOSPHOR.txt
│   └── THIRD_PARTY.md
├── README.md
├── bun.lock
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── scripts/
│   ├── audit-icons.ts
│   ├── copy-assets.ts
│   ├── generate-index.ts
│   └── assert-pack-files.ts
└── src/
    ├── svg.d.ts
    ├── index.ts
    ├── phosphor/
    │   └── index.ts
    └── custom/
        └── index.ts
```

### Red

```text
Given a fresh clone of astro-icons
When bun install --frozen-lockfile runs
Then dependency resolution is reproducible from bun.lock
```

Bun documents `--frozen-lockfile` for reproducible installs and exits when `package.json` disagrees with the lockfile.
([Bun][5])

### Green

Initialize the package and commit `bun.lock`.

### Refactor

Keep the repo free of monorepo-specific paths, aliases, and README references.

### Acceptance criteria

- GitLab project exists.
- Bun lockfile is committed.
- No `pnpm-lock.yaml`, workspace-only config, or monorepo-relative paths remain.
- Repository can run `bun install --frozen-lockfile`.

### Non-goals

- Do not publish yet.
- Do not wire CI release yet.
- Do not migrate the consumer app.

### Suggested execution order

Run after licensing verification, so the repository starts with a valid redistribution story.

---

## Phase 3: Define the Package Contract

### Goal

Make `@ravenhill/astro-icons` a clean, typed, ESM-only Astro icon package with stable subpath exports.

### Scope

Use this package surface:

```json
{
    "name": "@ravenhill/astro-icons",
    "version": "0.1.0",
    "description": "Astro SVG icon components — Phosphor icons and custom icons",
    "type": "module",
    "sideEffects": false,
    "peerDependencies": {
        "astro": ">=5.0.0"
    },
    "devDependencies": {
        "astro": "^5.0.0",
        "publint": "^0.3.19",
        "tsup": "^8.5.1",
        "typescript": "^5.9.2"
    },
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "import": "./dist/index.js"
        },
        "./phosphor": {
            "types": "./dist/phosphor/index.d.ts",
            "import": "./dist/phosphor/index.js"
        },
        "./custom": {
            "types": "./dist/custom/index.d.ts",
            "import": "./dist/custom/index.js"
        }
    },
    "types": "./dist/index.d.ts",
    "files": [
        "dist",
        "README.md",
        "LICENSE",
        "LICENSES"
    ],
    "scripts": {
        "generate": "bun scripts/generate-index.ts",
        "build": "bun run generate && tsup && bun scripts/copy-assets.ts",
        "typecheck": "tsc --noEmit",
        "lint": "publint --strict",
        "pack:check": "bun scripts/assert-pack-files.ts --pack",
        "check": "bun run build && bun run typecheck && bun run lint && bun run pack:check"
    },
    "publishConfig": {
        "@ravenhill:registry": "https://gitlab.com/api/v4/projects/r8vnhill%2Fastro-icons/packages/npm/",
        "access": "restricted"
    }
}
```

Node.js documents that `exports` encapsulates package subpaths, so every supported import path should be declared
deliberately. ([Node.js][6])

### Red

```text
Given the package exports root, phosphor, and custom entry points
When TypeScript resolves each entry
Then each entry has a matching declaration file

Given a consumer imports an undeclared package subpath
When module resolution runs
Then the subpath is not part of the public contract
```

### Green

Add `package.json`, `tsconfig.json`, `src/svg.d.ts`, and empty entry files.

Use extensionless internal exports:

```ts
export * from "./custom/index";
export * from "./phosphor/index";
```

### Refactor

If the package needs Bun-specific type support for scripts, keep it scoped to scripts or a separate
`tsconfig.scripts.json`; do not leak Bun-only assumptions into the published package surface.

### Acceptance criteria

- Root, `./phosphor`, and `./custom` exports are declared.
- Package is ESM-only.
- Astro is a peer dependency, not bundled.
- No TypeScript-extension imports are required in published source.
- `publint --strict` is part of `check`.

### Non-goals

- Do not support React/Vue/Svelte components.
- Do not support plain Node.js rendering of SVG components.
- Do not add CJS output unless a real consumer requires it.

### Suggested execution order

Do this before moving icons so package-shape problems are isolated.

---

## Phase 4: Split SVGs and Generate Barrels

### Goal

Move SVGs into explicit `phosphor` and `custom` namespaces and generate deterministic barrels.

### Scope

Final source structure:

```text
src/
├── index.ts
├── phosphor/
│   ├── index.ts
│   └── *.svg
└── custom/
    ├── index.ts
    └── *.svg
```

### Red

BDD-style checks:

```text
Given src/phosphor contains N SVG files
When bun run generate runs
Then src/phosphor/index.ts exports N icons

Given src/custom contains M SVG files
When bun run generate runs
Then src/custom/index.ts exports M icons

Given an SVG filename contains separators
When the barrel is generated
Then the export name is stable and valid TypeScript
```

DDT matrix:

| Input filename            | Expected export behavior   |
| ------------------------- | -------------------------- |
| `acorn.svg`               | `Acorn`                    |
| `arrow-left.svg`          | stable PascalCase name     |
| `nushell-logo.svg`        | stable PascalCase name     |
| duplicate generated names | fail with clear diagnostic |

### Green

Implement `scripts/generate-index.ts`.

Top-level barrel:

```ts
export * from "./custom/index";
export * from "./phosphor/index";
```

### Refactor

Make the generator small and testable:

- `listSvgFiles(directory)`
- `toExportName(filename)`
- `renderBarrel(exports)`
- `writeBarrel(directory, content)`

Keep each function short and deterministic.

### Acceptance criteria

- `src/phosphor/index.ts` is generated.
- `src/custom/index.ts` is generated.
- Generated barrels are deterministic.
- Duplicate export names fail fast.
- Top-level barrel re-exports both icon groups.
- No manual edits are required in generated files.

### Non-goals

- Do not optimize SVGs.
- Do not rename existing icons unless required to avoid invalid exports.
- Do not merge custom icons into the Phosphor namespace.

### Suggested execution order

Run after the package contract exists. Commit generated barrels only if that matches the project’s existing
generated-file policy; otherwise document that build always regenerates them.

---

## Phase 5: Build and Pack the Library

### Goal

Produce a publishable `dist/` package with JS, declarations, source maps, and copied SVG assets.

### Scope

Use multiple tsup entry points:

```ts
import { defineConfig } from "tsup";

export default defineConfig({
    entry: {
        index: "src/index.ts",
        "phosphor/index": "src/phosphor/index.ts",
        "custom/index": "src/custom/index.ts",
    },
    format: ["esm"],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    target: "es2022",
    outDir: "dist",
    external: [/\.svg$/],
});
```

### Red

```text
Given the package is built
When dist is inspected
Then each public export has JS, DTS, and source map outputs

Given SVG files exist in src/phosphor and src/custom
When build completes
Then dist/phosphor and dist/custom contain matching SVG files
```

DDT matrix:

| Source                  | Dist target                        | Required parity           |
| ----------------------- | ---------------------------------- | ------------------------- |
| `src/phosphor/*.svg`    | `dist/phosphor/*.svg`              | exact count and filenames |
| `src/custom/*.svg`      | `dist/custom/*.svg`                | exact count and filenames |
| `src/index.ts`          | `dist/index.js` / `.d.ts`          | exists                    |
| `src/phosphor/index.ts` | `dist/phosphor/index.js` / `.d.ts` | exists                    |
| `src/custom/index.ts`   | `dist/custom/index.js` / `.d.ts`   | exists                    |

### Green

Implement `scripts/copy-assets.ts`.

Use `bun pm pack` in pack validation unless a specific GitLab/npm compatibility issue appears. Bun now documents both
`bun pm pack` and `bun publish`. ([Bun][1])

### Refactor

Avoid duplicating parity logic. Extract reusable helpers:

- `countSvgFiles(directory)`
- `listTarballEntries(tarball)`
- `assertRequiredFiles(entries)`
- `assertBlockedFilesAbsent(entries)`
- `assertSvgParity(source, packed)`

### Acceptance criteria

- `bun run build` succeeds.
- `dist` contains JS, DTS, maps, and SVG assets.
- `bun run pack:check` validates required files.
- `pack:check` validates SVG parity independently for `phosphor` and `custom`.
- `pack:check` blocks source, scripts, configs, and migration artifacts from the tarball.
- `publint --strict` passes.

### Non-goals

- Do not add runtime SVG rendering tests here.
- Do not use Astro build as a package unit test.
- Do not publish from local machines as the primary release path.

### Suggested execution order

Run this before CI. CI should automate a command sequence that already passes locally.

---

## Phase 6: Add GitLab CI and Release Automation

### Goal

Automate validation, npm publishing, and GitLab release creation from tags.

### Scope

Use GitLab CI with Bun for test/build and GitLab npm registry publishing.

GitLab documents publishing npm packages from CI with `CI_PROJECT_ID` and `CI_JOB_TOKEN` in `.npmrc`. ([GitLab Docs][7])

Recommended CI shape:

```yaml
stages: [test, release]

variables:
    BUN_VERSION: "1"

.bun:
    image: oven/bun:${BUN_VERSION}
    before_script:
        - bun install --frozen-lockfile

test:
    extends: .bun
    stage: test
    script:
        - bun run check

release:
    extends: .bun
    stage: release
    rules:
        - if: '$CI_COMMIT_TAG =~ /^v\d+\.\d+\.\d+$/'
    before_script:
        - bun install --frozen-lockfile
        - |
              printf "@ravenhill:registry=https://${CI_SERVER_HOST}/api/v4/projects/${CI_PROJECT_ID}/packages/npm/\n" >> ~/.npmrc
              printf "//${CI_SERVER_HOST}/api/v4/projects/${CI_PROJECT_ID}/packages/npm/:_authToken=${CI_JOB_TOKEN}\n" >> ~/.npmrc
    script:
        - bun run check
        - npm publish
        - glab release create "$CI_COMMIT_TAG" --name "Release $CI_COMMIT_TAG" --notes "Published @ravenhill/astro-icons@${CI_COMMIT_TAG#v} to the GitLab npm registry."
```

Prefer a pinned or official `glab` installation strategy over the dynamic `curl | grep | tar` pipeline in the original
plan. The GitLab CLI documents `glab release create` for creating or updating releases and notes that it requires at
least Developer role. ([GitLab Docs][8])

### Red

```text
Given a non-tag commit
When the pipeline runs
Then only the test stage runs

Given a tag matching vX.Y.Z
When the pipeline runs
Then the release stage validates, publishes, and creates a GitLab release

Given npm auth is missing
When the release job runs
Then npm publish fails before release creation
```

### Green

Add `.gitlab-ci.yml`, then verify:

- branch pipeline runs `bun run check`;
- protected tag pipeline runs release job;
- required variables are configured.

### Refactor

If `glab` auth requires a token beyond `CI_JOB_TOKEN`, use a protected, masked `GLAB_TOKEN`. Otherwise prefer the
minimum viable credential.

### Acceptance criteria

- CI test job passes on branches.
- Release job runs only for SemVer tags.
- `npm publish` uses the GitLab project npm registry.
- GitLab release is created for `v0.1.0`.
- Release job does not run on arbitrary branches.

### Non-goals

- Do not introduce semantic-release yet.
- Do not publish from merge requests.
- Do not auto-bump versions.

### Suggested execution order

Do this after local package validation is reliable.

---

## Phase 7: Write Standalone Documentation and Consumer Smoke Test

### Goal

Document the package as an independent library and prove a real Astro app can consume it from the registry.

### Scope

README sections:

- What this package provides.
- Requirements: Astro 5+.
- GitLab registry setup.
- Installation with Bun.
- Imports from root, `/phosphor`, and `/custom`.
- Icon attribution.
- Adding icons.
- Build/check/publish workflow.

Astro’s docs support the consumer model because SVG files can be imported as Astro components and inlined in the
generated HTML. ([Astro Docs][4])

### Red

```text
Given a clean Astro test project with GitLab registry auth
When @ravenhill/astro-icons is installed
Then imports from root, /phosphor, and /custom type-check

Given an Astro page renders imported icons
When the project builds
Then SVG output is inlined into HTML
```

### Green

Create a temporary smoke-test consumer outside the package repo or under an ignored `tmp/consumer-smoke/`.

Example test imports:

```astro
---
import { Python } from "@ravenhill/astro-icons/custom";
import { Acorn } from "@ravenhill/astro-icons/phosphor";
---

<Acorn />
<Python />
```

### Refactor

If the smoke test is useful in CI, add it later as a separate consumer-check job. Keep it out of the initial release
unless registry auth is already stable in CI.

### Acceptance criteria

- README has no monorepo references.
- README explains registry configuration.
- README links to license and third-party attribution files.
- A real Astro consumer can install and build with the package.
- Root and subpath imports resolve in TypeScript.

### Non-goals

- Do not update `astro-website` yet.
- Do not add framework adapters.
- Do not document non-Astro usage as supported.

### Suggested execution order

Do this after the first successful local pack and before tagging `v0.1.0`.

---

## Phase 8: Initial Release

### Goal

Publish `@ravenhill/astro-icons@0.1.0` and create the matching GitLab release.

### Scope

Prepare:

```sh
bun install --frozen-lockfile
bun run check
git status --short
```

Release:

```sh
git tag v0.1.0
git push origin v0.1.0
```

The original plan correctly uses a tag-driven release workflow.

### Red

```text
Given v0.1.0 is pushed
When the GitLab pipeline runs
Then release automation publishes exactly package version 0.1.0
```

### Green

Wait for the tag pipeline result, then verify the package in GitLab.

### Refactor

After release, create a follow-up issue for `astro-website` migration from workspace dependency to registry dependency.

### Acceptance criteria

- `v0.1.0` tag exists.
- GitLab npm package exists.
- GitLab release exists.
- Published package contains expected `dist` files.
- Published package contains license and attribution files.
- Consumer smoke test succeeds from the registry package.

### Non-goals

- Do not migrate `astro-website` in this phase.
- Do not release `1.0.0`.
- Do not add additional icons during release stabilization.

### Suggested execution order

Run only after all local and CI checks pass.

---

# Final Verification Matrix

| Layer         | Command or check                | Expected result                                                 |
| ------------- | ------------------------------- | --------------------------------------------------------------- |
| Install       | `bun install --frozen-lockfile` | lockfile-consistent install                                     |
| Generate      | `bun run generate`              | deterministic `src/phosphor/index.ts` and `src/custom/index.ts` |
| Build         | `bun run build`                 | JS, DTS, maps, and SVGs in `dist`                               |
| Typecheck     | `bun run typecheck`             | zero TypeScript errors                                          |
| Package lint  | `bun run lint`                  | `publint --strict` passes                                       |
| Pack contract | `bun run pack:check`            | required files included, blocked files excluded                 |
| CI branch     | push normal commit              | test stage passes only                                          |
| CI tag        | push `v0.1.0`                   | package published and release created                           |
| Consumer      | install in Astro app            | root and subpath imports resolve                                |
| Runtime       | Astro build                     | SVG components render inline                                    |

---

# Deferred follow-up

Create a separate plan for:

```text
Migrate astro-website from workspace @ravenhill/phosphor-icons to published @ravenhill/astro-icons.
```

That follow-up should cover alias removal, dependency replacement, import updates, lockfile update, and Astro build
verification.

[1]: https://bun.com/docs/pm/cli/publish?utm_source=chatgpt.com "bun publish"
[2]: https://www.typescriptlang.org/tsconfig/?utm_source=chatgpt.com "TSConfig Reference - Docs on every TSConfig option"
[3]: https://phosphoricons.com/?utm_source=chatgpt.com "Phosphor Icons"
[4]: https://docs.astro.build/en/guides/images/?utm_source=chatgpt.com "Images - Astro Docs"
[5]: https://bun.com/docs/pm/cli/install?utm_source=chatgpt.com "bun install"
[6]: https://nodejs.org/api/packages.html?utm_source=chatgpt.com "Modules: Packages | Node.js v26.3.0 Documentation"
[7]: https://docs.gitlab.com/user/packages/npm_registry/?utm_source=chatgpt.com "npm packages in the package registry"
[8]: https://docs.gitlab.com/cli/release/create/?utm_source=chatgpt.com "glab release create"
