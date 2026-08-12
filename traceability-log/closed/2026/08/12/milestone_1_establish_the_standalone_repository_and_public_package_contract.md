# [DONE] Milestone 1 — Establish the Standalone Repository and Public Package Contract

## Closure Record — 2026-08-12

Implemented in the standalone repository `E:\teaching\DIBS\projects\astro-icons`.

Verified with `bun install --frozen-lockfile` and `bun run check`. The repository now has a pinned Bun 1.3.14
toolchain, committed lockfile, TypeScript 6 baseline, Biome formatting/linting/import organization, explicit ESM
exports for root, `/phosphor`, and `/custom`, Astro peer and development dependencies, test-only SVG fixtures, a
single packed-artifact verification flow, `publint`, `attw`, and verification-only GitLab CI.

The production SVG corpus, release-policy generation, consumer migration, remote repository creation, registry
configuration, and publishing remain deferred to later milestones as specified below.

## Scope Classification

**Medium scope → phases.**

The milestone should be decomposed into five phases:

1. establish the reproducible repository/toolchain baseline;
2. define the package and type-level public contract;
3. prove the build contract using test-only fixtures;
4. establish quality and packed-artifact verification;
5. document and close the milestone.

This keeps the milestone focused on **repository and package-contract establishment**. The real SVG corpus,
release-policy-driven generation, consumer migration, remote GitLab creation, and publishing remain later work.

---

# Architectural Direction

Use a small **functional core / imperative shell** from the beginning:

```text
package contract
     +
fixture model
     |
     v
pure build/contract helpers
     |
     +---------------------+
     |                     |
     v                     v
filesystem/build shell   artifact verifier
                               |
                               v
                         structured findings
```

Milestone 1 should establish abstractions that Milestone 2 can reuse, without prematurely implementing corpus migration.

The following responsibilities should remain separate:

```text
package API declaration
        !=
source generation
        !=
asset migration
        !=
packed-artifact verification
        !=
consumer migration
```

Do not introduce microservices. A standalone repository is already the deployment boundary; package-local modules are
the correct modular unit.

---

# Phase 1.1 — Establish the Reproducible Repository Baseline

## Goal

Create the standalone repository skeleton with a pinned, reproducible toolchain and no dependencies on the source
monorepo.

## Scope

Create locally under:

```text
E:\teaching\DIBS\projects\astro-icons
```

Initial structure:

```text
astro-icons/
├── .gitignore
├── .gitlab-ci.yml
├── AGENTS.md
├── LICENSE
├── LICENSES/
├── README.md
├── biome.json
├── bun.lock
├── migration/
├── package.json
├── scripts/
│   └── lib/
├── src/
├── tests/
│   └── fixtures/
├── tsconfig.json
└── tsup.config.ts
```

Pin:

```text
Bun       1.3.14
Astro     7.2.1 as development/test dependency
TypeScript 6.0.x
Biome     2.5.x
publint   0.3.21
attw      0.18.3
```

Use the lockfile as the exact transitive-version authority. Bun's frozen-install mode is specifically intended for
reproducible installs and rejects package/lockfile disagreement. ([Bun][6])

## BDD Characterization

```gherkin
Feature: Reproducible standalone repository

Scenario: A clean checkout installs without modifying dependency state
  Given package.json and bun.lock are committed
  When bun install --frozen-lockfile runs
  Then dependency installation succeeds
  And bun.lock remains unchanged

Scenario: Monorepo-specific configuration is absent
  Given the standalone repository
  When configuration and source files are inspected
  Then no workspace-only aliases are required
  And no parent-repository relative paths are required
```

## Implementation Guidance

Prefer explicit scripts with single responsibilities:

```json
{
    "scripts": {
        "format": "...",
        "format:check": "...",
        "lint": "...",
        "test": "...",
        "typecheck": "...",
        "build": "...",
        "pack": "...",
        "pack:check": "...",
        "check": "..."
    }
}
```

Do not make `check` the only way to execute individual quality gates.

Configure Biome for:

```text
indentWidth = 4
lineWidth   = 120
```

and enable import organization through Biome's assist functionality rather than adding another import-sorting tool.
([Biome][7])

## Acceptance Criteria

- Standalone directory is self-contained.
- `bun.lock` is committed.
- `bun install --frozen-lockfile` succeeds from a clean state.
- Bun version is explicitly pinned/documented.
- TypeScript 6 is the initial compiler baseline.
- Biome owns source formatting/linting/import organization.
- No pnpm workspace configuration is required.
- No monorepo-relative imports or aliases remain.
- No source file exceeds 500 lines.

## Non-Goals

- Do not create the GitLab remote.
- Do not copy the production SVG corpus.
- Do not configure registry authentication.
- Do not publish anything.
- Do not modify the consumer repository.

## Suggested Execution Order

Run first.

---

# Phase 1.2 — Define the Public Package and Type Contract

## Goal

Define the complete public API shape before adding real assets.

## Scope

Create:

```text
src/
├── index.ts
├── phosphor/
│   └── index.ts
├── custom/
│   └── index.ts
└── svg.d.ts
```

Public package paths:

```text
@ravenhill/astro-icons
@ravenhill/astro-icons/phosphor
@ravenhill/astro-icons/custom
```

Use explicit package `exports`.

Suggested contract:

```json
{
    "name": "@ravenhill/astro-icons",
    "version": "0.1.0",
    "type": "module",
    "sideEffects": false,
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
    "peerDependencies": {
        "astro": ">=5.14.0 <8"
    }
}
```

The `exports` map should be the authoritative public-subpath contract. Anything not declared there should be considered
internal.

## Important Correction — Astro Dependency Semantics

Do **not** require:

> Astro appears only as a peer dependency.

That would contradict the repository's own need to compile against Astro's types.

Use Astro as:

```text
peerDependency → consumer compatibility contract
devDependency  → local build/type/test implementation dependency
```

but **not** as a production `"dependency"`.

That is the precise invariant.

Astro's official `SvgComponent` type is available from:

```ts
import type { SvgComponent } from "astro/types";
```

since Astro 5.14. ([Astro Documentation][8])

Therefore:

```ts
declare module "*.svg" {
    import type { SvgComponent } from "astro/types";

    const component: SvgComponent;
    export default component;
}
```

is preferable to maintaining a locally duplicated Astro component type.

## BDD Characterization

```gherkin
Feature: Public package entry points

Scenario Outline: Declared public entry points resolve
  Given the standalone package has been built
  When a consumer resolves <entry>
  Then JavaScript is available
  And a declaration file is available

Examples:
  | entry                                  |
  | @ravenhill/astro-icons                 |
  | @ravenhill/astro-icons/phosphor        |
  | @ravenhill/astro-icons/custom          |

Scenario: Internal paths are encapsulated
  Given a package-internal source path
  When a consumer imports it through the package name
  Then it is not part of the exported package contract

Scenario: The package remains ESM-only
  Given the built artifact
  When public entries are inspected
  Then no CommonJS entry is advertised
```

## TypeScript Configuration

For a new TS 6 repository, evaluate:

```json
{
    "compilerOptions": {
        "strict": true,
        "noEmit": true,
        "module": "ESNext",
        "moduleResolution": "Bundler",
        "target": "ES2025",
        "lib": ["ES2025"],
        "verbatimModuleSyntax": true,
        "isolatedModules": true,
        "noUncheckedIndexedAccess": true,
        "exactOptionalPropertyTypes": true
    }
}
```

TypeScript 6 now supports `es2025` directly. ([TypeScript][3])

Use only options that pass the package's real build and declaration-generation workflow; do not enable strictness flags
merely for novelty.

## Acceptance Criteria

- Three public entry points are explicit.
- Undeclared subpaths are encapsulated.
- Package is ESM-only.
- Astro is a peer dependency and development dependency, not a runtime dependency.
- `SvgComponent` comes from Astro's public type API.
- TypeScript strict mode is enabled.
- Public entry files remain small.
- No temporary fixture export becomes a permanent public API accidentally.

## Non-Goals

- Do not guarantee Astro 5/6/7 compatibility solely from the SemVer range; Milestone 3 must prove it.
- Do not add CJS output.
- Do not add framework-neutral SVG rendering.
- Do not add wildcard exports.
- Do not add package subpaths speculatively.

## Suggested Execution Order

Run after the reproducible repository baseline.

---

# Phase 1.3 — Prove the Build Contract with Test-Only Fixtures

## Goal

Verify the three-entry build architecture without prematurely introducing fake production icons or migrating the real
corpus.

## Scope

This is an important change from the current proposal.

Do **not** place synthetic contract fixtures into the production public source tree if doing so would make them
published API.

Instead create:

```text
tests/fixtures/
└── package-source/
    ├── index.ts
    ├── phosphor/
    │   ├── index.ts
    │   └── roshar-test.svg
    └── custom/
        ├── index.ts
        └── scadrial-test.svg
```

The names are synthetic test data only.

The production entries may remain structurally minimal until Milestone 2.

## Build Configuration

Keep `tsup.config.ts` declarative:

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
    target: "es2025",
    outDir: "dist",
    external: [/\.svg$/u],
});
```

Do not add multiple bundlers or Bun's bundler merely because Bun is the package manager. Keeping tsup preserves
separation between **runtime/package-manager migration** and **build-system migration**.

## BDD Characterization

```gherkin
Feature: Multi-entry ESM build

Scenario Outline: Every public entry produces its complete artifact triple
  Given the package source
  When the package is built
  Then <entry>.js exists
  And <entry>.d.ts exists
  And <entry>.js.map exists

Examples:
  | entry                  |
  | index                  |
  | phosphor/index         |
  | custom/index           |

Scenario: SVG imports remain external assets
  Given a fixture entry imports an SVG
  When the fixture package is built
  Then the SVG is not converted into an unrelated runtime representation

Scenario: Entry-point isolation is preserved
  Given a Phosphor-only fixture import
  When the phosphor subpath is inspected
  Then no custom fixture is exported from that subpath
```

## Testability Refactor

If build-planning logic begins appearing in shell scripts, extract pure pieces:

```ts
deriveEntryPoints();
deriveExpectedBuildFiles();
compareArtifactFiles();
```

Keep process execution in test/build adapters.

## Acceptance Criteria

- Production build creates JS/DTS/source maps for all three entries.
- Fixture tests prove SVG handling separately from production data.
- Phosphor/custom subpaths are isolated.
- Root entry can re-export both subpath APIs structurally.
- No fixture icon becomes an accidental published production contract.
- No source file exceeds 500 lines.
- Build scripts/functions remain short and cohesive.

## Non-Goals

- Do not migrate real icons.
- Do not implement production barrel generation yet.
- Do not implement real SVG parity.
- Do not create a temporary API that Milestone 2 must later break.

## Suggested Execution Order

Run after the package contract is fixed.

---

# Phase 1.4 — Establish Quality Gates and Packed-Artifact Verification

## Goal

Verify the package at the level consumers actually receive: the packed artifact.

## Scope

Separate quality responsibilities:

```text
Biome
    -> source formatting / linting / imports

tsc
    -> source type correctness

tests
    -> behavioral/package-contract unit tests

tsup
    -> build

pack
    -> publishable artifact production

publint
    -> package metadata / packaging correctness

attw
    -> TypeScript resolution correctness of packed package
```

Publint is specifically a package-linting tool, while `attw` analyzes TypeScript resolution problems across package
entry points. ([GitHub][9])

## Pack Once

Introduce an explicit package-artifact command:

```text
pack
```

and make downstream package verification consume its `.tgz`.

Prefer:

```text
build
    ↓
pack once
    ↓
pack-contract
publint
attw
```

rather than letting every verifier independently repack the repository.

This prepares Milestone 4's eventual invariant:

> verify the same bytes that will later be published.

## BDD Characterization

```gherkin
Feature: Packed artifact quality

Scenario: Required public files are present
  Given the package has been packed
  When the artifact is inspected
  Then package.json is present
  And README.md is present
  And LICENSE is present
  And required LICENSES files are present
  And each declared public entry exists

Scenario: Development internals are absent
  Given the packed artifact
  Then tests are absent
  And scripts are absent unless explicitly required at runtime
  And migration is absent
  And source-only configuration is absent

Scenario: Package metadata and declarations agree
  Given the packed tarball
  When publint and attw inspect it
  Then neither reports a blocking package-contract defect
```

`attw` explicitly supports checking a pre-built tarball, so use that mode instead of allowing it to repack
independently. ([GitHub][10])

## Recommended Canonical Gate

```text
bun run format:check
        ↓
bun run lint
        ↓
bun run test
        ↓
bun run typecheck
        ↓
bun run build
        ↓
bun run pack
        ↓
bun run pack:check
        ↓
bun run publint
        ↓
bun run attw
```

The aggregate:

```text
bun run check
```

should compose these named operations, not duplicate their underlying commands.

## CI Scope

`.gitlab-ci.yml` may exist now, but Milestone 1 should contain **verification only**:

```yaml
stages:
    - verify
```

with a pinned Bun image and frozen install.

Do not add:

- registry credentials;
- publish jobs;
- tag rules;
- GitLab releases;
- version bumping.

Since remote repository creation is explicitly outside this milestone, CI configuration can be authored and
syntax-reviewed locally, but remote pipeline execution should not be an acceptance requirement until a remote exists.

## Acceptance Criteria

- Biome passes.
- TypeScript passes.
- Unit/contract tests pass.
- Build passes.
- A single packed artifact is produced for verification.
- `publint` 0.3.21 passes against the package.
- `attw` 0.18.3 passes against the packed tarball. ([GitHub][5])
- Required files are present.
- Internal-only files are absent.
- Quality commands remain independently executable.
- `check` composes the independent gates.
- CI contains verification only.

## Non-Goals

- Do not publish.
- Do not add registry auth.
- Do not add release automation.
- Do not run a consumer-version matrix yet.
- Do not add mutation-testing infrastructure yet.

## Suggested Execution Order

Run after the build contract works locally.

---

# Phase 1.5 — Complete Standalone Documentation and Traceability

## Goal

Make the new repository understandable independently, while keeping consumer migration work clearly deferred.

## Scope

Update **only the standalone repository's** documentation and the migration traceability that owns this milestone.

### README

Document:

```text
purpose
supported package paths
Astro peer range
installation
root/phosphor/custom imports
ESM-only contract
build/check commands
licensing and attribution
status of the production icon corpus
```

Be explicit that the repository skeleton exists before corpus migration.

Do not document test-only fixtures as package features.

### AGENTS.md

Include maintainer-specific rules:

```text
4-space indentation
120-column target
<500-line source modules
functional core / imperative shell
TDD / BDD expectations
generated-file policy
package-boundary rules
licensing evidence preservation
```

### Contributor Guidance

I would **not add a separate contribution document unless there is enough repository-specific workflow to justify it**.

If contribution guidance is short, put it in:

```text
AGENTS.md
README.md
```

rather than creating `CONTRIBUTING.md` simply because repositories often have one.

### Consumer-Site Documentation

Defer this bullet from the original plan:

> Update the site's documentation to prepare future migration.

That crosses the repository boundary and weakens the milestone's isolation.

Instead, record in traceability:

```text
Deferred:
Migrate astro-website documentation and imports from $icons/workspace usage
to the standalone public package contract.
```

Actual consumer documentation should change together with consumer behavior, not one or more milestones earlier.

## BDD Documentation Contract

```gherkin
Feature: Standalone documentation

Scenario: A maintainer can understand the package without the old monorepo
  Given the standalone README and AGENTS.md
  When a maintainer follows the documented workflow
  Then no undocumented monorepo path or alias is required

Scenario: Deferred consumer migration remains explicit
  Given Milestone 1 is complete
  Then the documentation does not claim astro-website already consumes the package
  And traceability identifies that migration as future work
```

## Acceptance Criteria

- README is standalone.
- README documents all three public package paths.
- README distinguishes current Milestone 1 capability from future corpus migration.
- AGENTS documents package-local engineering rules.
- Licensing documentation is linked clearly.
- No statement implies the package has already been published.
- No statement implies the site already consumes it.
- Consumer-repository documentation remains unchanged.
- Traceability clearly identifies work owned by Milestones 2–5.

## Non-Goals

- Do not modify `astro-website`.
- Do not change `$icons`.
- Do not migrate imports.
- Do not create release notes.
- Do not modify old changelogs.
- Do not claim registry availability.

## Suggested Execution Order

Run last.

---

# Final Acceptance Matrix

| Area                  | Milestone 1 acceptance                                 |
| --------------------- | ------------------------------------------------------ |
| Repository            | Standalone, no monorepo-relative dependency            |
| Runtime               | Bun 1.3.14 pinned                                      |
| Install               | Frozen-lockfile install succeeds                       |
| Language              | TypeScript 6 baseline                                  |
| Formatting            | Biome, 4 spaces, 120-column target                     |
| Package               | ESM-only                                               |
| Public API            | Root, `/phosphor`, `/custom` explicitly exported       |
| Encapsulation         | Undeclared subpaths unavailable                        |
| Astro                 | `>=5.14 <8` peer contract, 7.2.1 dev baseline          |
| Astro dependency      | Peer + dev dependency, never normal runtime dependency |
| SVG typing            | Official `SvgComponent` type                           |
| Build                 | JS + DTS + source maps for all entry points            |
| Fixtures              | Test-only; no temporary production API                 |
| Source size           | ≤500 lines/module                                      |
| Package lint          | publint passes                                         |
| Type-package analysis | attw passes against the packed tarball                 |
| Packaging             | Required files present; internals absent               |
| CI                    | Verification-only, pinned Bun, frozen install          |
| Consumer repository   | Unchanged                                              |
| Registry              | No publication                                         |
| Release automation    | Deferred                                               |
| Real SVG corpus       | Deferred to Milestone 2                                |
| Traceability          | Milestone ownership and deferrals explicit             |

# Testing-Technique Decision

For this milestone, **BDD + DDT + artifact integration testing** provide the highest value.

PBT should be deferred: the production icon-name/input domain is not being introduced yet, so there is no meaningful
broad generative space to exercise. Mock testing should be narrow and confined to filesystem/process boundaries;
dependency injection is preferable for project-owned shells. Metamorphic testing becomes valuable in Milestone 2 for
deterministic generation and ordering invariance. Differential testing is unnecessary, although `publint` and `attw`
intentionally provide **independent analyzers** of the same packed package from different perspectives. Mutation testing
and fuzzing would add infrastructure without enough Milestone 1 domain logic to justify them.

The two most important changes I would make to the current draft are therefore:

1. **keep fixtures completely outside the production public surface**, so Milestone 1 does not create an API that
   Milestone 2 immediately has to delete; and
2. **remove all `astro-website` documentation edits from Milestone 1**, keeping the standalone-repository milestone
   genuinely standalone.

[1]: https://bun.com/blog/bun-v1.3.14 "Bun v1.3.14 | Bun Blog"
[2]: https://github.com/withastro/astro/releases?utm_source=chatgpt.com "Releases · withastro/astro - GitHub"
[3]: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html "TypeScript: Documentation - TypeScript 6.0"
[4]: https://biomejs.dev/blog/biome-v2-5/ "Biome v2.5—500 Lint Rules, Plugin Code Fix, and Cross-File Linting | Biome"
[5]: https://github.com/publint/publint/releases?utm_source=chatgpt.com "Releases · publint/publint"
[6]: https://bun.sh/docs/pm/cli/install?utm_source=chatgpt.com "bun install"
[7]: https://biomejs.dev/assist/actions/organize-imports/?utm_source=chatgpt.com "organizeImports | Biome"
[8]: https://docs.astro.build/en/guides/images/ "Images | Docs"
[9]: https://github.com/publint/publint?utm_source=chatgpt.com "publint/publint: Lint packaging errors"
[10]: https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/packages/cli/README.md?utm_source=chatgpt.com "README.md - arethetypeswrong CLI"
