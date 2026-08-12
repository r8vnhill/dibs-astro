# [PLAN] Promote `@ravenhill/astro-icons` as a Reproducible, Policy-Driven Standalone Package

## Scope Classification

**Large scope → milestones.**

Recommended decomposition:

1. **Preserve the audited source and licensing contract** `[DONE]`
2. **Establish the standalone repository and public package contract**
3. **Migrate assets into a deterministic, policy-driven build**
4. **Prove package correctness and consumer compatibility**
5. **Establish reproducible CI/CD and immutable release artifacts**
6. **Document, release, and verify `v0.1.0`**

This is smaller and more cohesive than the original nine-phase sequence while preserving its major goals.

---

# Cross-Cutting Architecture

Use a **functional core / imperative shell** rather than independent scripts that rediscover package rules:

```text
          audited inventory
                 +
        attribution metadata
                 |
                 v
         release-plan core
        /        |        \
       /         |         \
      v          v          v
export plan   copy plan   pack contract
    |             |             |
    v             v             v
generator      filesystem      artifact
  shell           shell         checker
```

The core owns:

- source classification;
- release eligibility;
- export-name derivation;
- expected public asset set;
- required attribution files;
- deterministic output planning;
- structural findings.

Shells own:

- filesystem access;
- repository creation;
- file copying;
- process execution;
- GitLab/package-registry interaction;
- console output.

Do not introduce microservices. A standalone library repository already provides the deployment boundary; inside it,
small modules are the appropriate level of modularity.

---

# Toolchain Baseline

Because this is a **new standalone repository**, I would start with current stable tooling instead of carrying forward
versions merely because the source monorepo used them.

- **Bun 1.3.14** is the current Bun release; pin the exact CI image rather than `oven/bun:1`. ([GitHub][1])
- **TypeScript 6.0** is current. It is explicitly a transition release with breaking changes/deprecations before the
  native TypeScript 7 compiler, so adopt it only once the package and consumer tests pass. For a pre-`0.1.0` standalone
  repository, now is the lowest-cost point to perform that evaluation. ([TypeScript][2])
- **Astro 7.2** is current as of July 31, 2026. ([Astro][3])
- Use **Biome 2.5+** for TypeScript/JSON formatting and linting rather than relying on `publint` as if it were a source
  linter. Biome combines formatting and linting and currently has more than 500 lint rules. ([Biome][4])
- Keep `tsup` initially. Changing repository, package manager, package name, package topology, and bundler
  simultaneously would unnecessarily enlarge the migration oracle.

A particularly important correction is the peer dependency. The original plan specifies:

```json
"astro": ">=5.0.0"
```

but stable SVG-component imports were added in **Astro 5.7**, and Astro's official `SvgComponent` type was added in
**5.14**. ([Astro Documentation][5])

If the library uses the official type—and I recommend it—the initial compatibility contract should therefore be
approximately:

```json
{
    "peerDependencies": {
        "astro": ">=5.14.0 <8"
    },
    "devDependencies": {
        "astro": "^7.2.0",
        "typescript": "^6.0.0"
    }
}
```

Do not claim the `5.x–7.x` range merely from reasoning. Back it with a consumer compatibility matrix in Milestone 4.

---

# Milestone 0 — Preserve the Audited Source and Licensing Contract `[DONE]`

## Goal

Carry forward the evidence established by the original Phases 0 and 1 without reopening settled provenance work.

The existing plan already characterizes the icon inventory, existing export names, custom/Phosphor classification, and
licensing/attribution baseline.

## Scope

Preserve:

```text
migration/icon-inventory.json

LICENSE
LICENSES/
├── PHOSPHOR.txt
├── THIRD_PARTY.md
└── supporting attribution metadata
```

Treat these as **migration inputs**, not data to be regenerated casually in the new repository.

## Key BDD Contract

```gherkin
Feature: Migration evidence preservation

Scenario: Every migrated public asset originates from audited evidence
  Given the frozen icon inventory
  And the verified release metadata
  When the standalone publication plan is derived
  Then every publishable SVG is present in the inventory
  And its release policy allows publication

Scenario: An unaudited SVG cannot silently enter the package
  Given an SVG not present in the frozen inventory
  When the package release plan is derived
  Then publication fails closed
```

## Acceptance Criteria

- Existing classification is preserved.
- Existing export names are preserved unless an explicit compatibility decision says otherwise.
- Licensing evidence is copied without semantic rewriting.
- Assets with unresolved redistribution status remain excluded.
- Source SVG bytes are unchanged during migration.

## Non-Goals

- Do not reclassify icons.
- Do not create new legal conclusions.
- Do not add new icons.
- Do not migrate the consumer site.

## Suggested Execution Order

Already complete. Treat this milestone as the immutable migration baseline.

---

# Milestone 1 — Establish the Standalone Repository and Public Package Contract [DONE]

## Goal

Create a reproducible standalone repository whose public API, runtime assumptions, package-manager contract, and
source-quality tooling are explicit before assets are moved.

## Scope

Create approximately:

```text
astro-icons/
├── .gitignore
├── .gitlab-ci.yml
├── biome.json
├── bun.lock
├── CHANGELOG.md
├── LICENSE
├── LICENSES/
├── migration/
├── package.json
├── README.md
├── tsconfig.json
├── tsup.config.ts
├── scripts/
├── src/
└── tests/
```

Use Bun's text `bun.lock`, and require:

```sh
bun install --frozen-lockfile
```

for clean installs. Bun documents that this mode fails if `package.json` and the lockfile disagree. ([Bun][6])

Pin CI:

```yaml
image: oven/bun:1.3.14
```

rather than:

```yaml
image: oven/bun:1
```

so CI does not change underneath an unchanged commit. ([GitHub][1])

## Public Package Surface

Preserve the original three intentional entry points:

```text
@ravenhill/astro-icons
@ravenhill/astro-icons/phosphor
@ravenhill/astro-icons/custom
```

Node's `exports` field encapsulates undeclared package subpaths, which is exactly the behavior wanted here.
([Node.js][7])

Suggested package shape:

```json
{
    "name": "@ravenhill/astro-icons",
    "version": "0.1.0",
    "type": "module",
    "sideEffects": false,
    "peerDependencies": {
        "astro": ">=5.14.0 <8"
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
    "files": [
        "dist",
        "README.md",
        "LICENSE",
        "LICENSES"
    ]
}
```

GitLab currently documents scoped registry configuration in `publishConfig` and CI authentication using `CI_PROJECT_ID`
and `CI_JOB_TOKEN`. ([GitLab Docs][8])

## Use Astro's Official SVG Type

Prefer:

```ts
declare module "*.svg" {
    import type { SvgComponent } from "astro/types";

    const component: SvgComponent;
    export default component;
}
```

over maintaining a parallel approximation of Astro's SVG-component interface. Astro provides this type starting in 5.14.
([Astro Documentation][5])

## Source Quality Tooling

Add Biome for:

- four-space indentation;
- approximately 120-column formatting;
- TypeScript/JavaScript linting;
- JSON formatting;
- import organization.

Keep:

```text
publint
```

for **package metadata/artifact correctness**, not general source linting.

Also add:

```text
@arethetypeswrong/cli
```

to package verification. Its CLI analyzes the packed artifact under several TypeScript module-resolution modes and
catches ESM/type declaration mistakes that `publint` does not necessarily model identically. ([GitHub][9])

## Key BDD Contracts

```gherkin
Feature: Standalone package contract

Scenario Outline: Declared package entries resolve
  Given a clean package build
  When <entry> is resolved
  Then JavaScript exists
  And matching declarations exist

Examples:
  | entry       |
  | root        |
  | phosphor    |
  | custom      |

Scenario: Undeclared subpaths remain private
  Given a consumer imports an internal package path
  When module resolution occurs
  Then the path is not exported
```

## Acceptance Criteria

- Fresh clone installs through the pinned Bun toolchain.
- `bun.lock` is committed.
- Package is ESM-only.
- Public exports are explicit.
- Astro is a peer, not bundled.
- Peer floor reflects actual SVG typing/runtime requirements.
- Biome enforces project source style.
- `publint` and `attw` responsibilities are distinct.
- No source module exceeds 500 lines.
- No monorepo-relative aliases or paths remain.

## Non-Goals

- Do not move the SVG corpus yet.
- Do not publish.
- Do not create release automation yet.
- Do not add CJS output speculatively.
- Do not add framework adapters.

## Suggested Execution Order

First remaining milestone.

---

# Milestone 2 — Migrate Assets into a Deterministic, Policy-Driven Build

## Goal

Move the audited source corpus without changing existing icon semantics and make a single pure release plan drive
generation, copying, and verification.

## Scope

Recommended modules:

```text
scripts/
├── lib/
│   ├── inventory.ts
│   ├── release-policy.ts
│   ├── export-plan.ts
│   └── pack-contract.ts
├── generate-index.ts
├── copy-assets.ts
└── assert-pack-files.ts
```

Source:

```text
src/
├── index.ts
├── svg.d.ts
├── phosphor/
│   └── *.svg
├── custom/
│   └── *.svg
└── generated/
    ├── phosphor/
    └── custom/
```

## Do Not Generate Monolithic 1,500-Line Barrels

The original plan's single:

```text
src/phosphor/index.ts
```

would violate the requested 500-line source limit once it contains roughly 1,500 exports.

Generate deterministic shards instead:

```text
src/generated/phosphor/
├── part-001.ts
├── part-002.ts
├── ...
└── part-006.ts
```

with a conservative bound such as **300 exports per shard**.

Then:

```ts
export * from "../generated/phosphor/part-001";
export * from "../generated/phosphor/part-002";
```

The top-level modules remain small.

## Release Plan as Single Source of Truth

Derive:

```ts
type ReleasePlan = {
    readonly phosphor: readonly IconExport[];
    readonly custom: readonly IconExport[];
    readonly requiredLicenseFiles: readonly string[];
};
```

Conceptually:

```text
inventory + attribution metadata
               ↓
        deriveReleasePlan()
               ↓
       +-------+--------+
       |       |        |
       v       v        v
    exports   assets   pack expected-set
```

Do not let the generator and pack checker independently infer policy from filesystem contents.

## Generator Design

Pure functions should look approximately like:

```ts
toExportName(filename);
detectExportCollisions(exports);
partitionExports(exports, shardSize);
renderExportShard(exports);
planGeneratedFiles(releasePlan);
```

Effects should be limited to:

```ts
readMigrationInputs();
writeGeneratedFiles(plan);
removeStaleGeneratedFiles(plan);
```

Also detect **cross-namespace root collisions**. It is insufficient to detect a duplicate only within `phosphor` or
`custom` if root exports re-export both sets.

## Generated-Source Policy

Choose one policy explicitly.

I recommend **committing generated modules** because they constitute the package's browsable TypeScript API, but add:

```sh
bun run generate:check
```

which computes expected output without modifying files and fails if committed generated files are stale.

`check` should not silently regenerate them and hide drift.

## Pack Contract

Do not compare only SVG counts.

Require exact set equality:

```text
expected publishable filenames
              ==
actual packed SVG filenames
```

Diagnostics should distinguish:

```text
missingAssets
unexpectedAssets
missingLegalFiles
blockedFiles
```

## Key BDD Contracts

```gherkin
Feature: Deterministic export generation

Scenario: Equivalent inventory produces byte-identical generated modules
Scenario: Export collisions fail before files are written
Scenario: Every generated source module remains below the configured size limit

Feature: Exact package asset contract

Scenario: Equal SVG counts with different filenames fail
Scenario: A required SVG missing from the artifact is named
Scenario: An unexpected SVG is rejected
```

## Testing Strategy

Use DDT heavily for filename conversion:

| Input              | Expected          |
| ------------------ | ----------------- |
| `acorn.svg`        | `Acorn`           |
| `arrow-left.svg`   | stable PascalCase |
| `nushell-logo.svg` | stable PascalCase |
| colliding names    | failure           |
| invalid name       | explicit failure  |

Use metamorphic tests for:

- source ordering does not affect generated output;
- inventory ordering does not affect the publication set;
- adding an unrelated excluded record cannot alter existing exports.

**PBT:** optional. If `toExportName()` is designed to accept arbitrary filenames, `fast-check` becomes reasonable for
Unicode, separator, normalization, and collision properties. If filenames come only from the audited finite corpus, DDT
plus metamorphic testing is sufficient and avoids another dependency.

## Acceptance Criteria

- Every migrated SVG comes from audited inventory.
- Existing public export names are preserved.
- Release-ineligible icons cannot enter the artifact.
- Generated output is deterministic.
- No generated source exceeds 500 lines.
- Cross-group export collisions are detected.
- Build copies exactly the planned SVG set.
- Exact filename parity replaces count parity.
- `generate:check` is non-mutating.
- Pure logic has no filesystem or process dependencies.

## Non-Goals

- Do not optimize/rewrite SVG contents.
- Do not rename exports for aesthetics.
- Do not add icons.
- Do not change licensing conclusions.
- Do not add another bundler.

## Suggested Execution Order

After the package contract is executable but before CI work.

---

# Milestone 3 — Prove Package Correctness and Consumer Compatibility

## Goal

Test the library at the abstraction boundaries that actually matter: pure policy, generated code, packed package
semantics, TypeScript resolution, and Astro consumption.

## Scope

Use a test pyramid:

```text
       real Astro consumer
             /\
            /  \
   packed artifact tests
          /      \
 shell/integration tests
       /          \
pure policy/generator tests
```

Use Bun's built-in test runner rather than adding Jest/Vitest solely for this repository. Bun supports mocks and spies
when boundary doubles are genuinely required. ([Bun][10])

Prefer dependency injection over module mocking for your own shell code.

## Unit / Pure Tests

BDD coverage for:

- inventory correspondence;
- release-policy decisions;
- export naming;
- sharding;
- collisions;
- legal-file derivation;
- exact asset-set comparison.

## Artifact Tests

Build one tarball, then run:

```text
publint --strict
attw <tarball>
custom pack-contract checker
```

`@arethetypeswrong/cli` specifically supports checking a packed tarball or packing a directory itself. ([GitHub][9])

## Consumer Compatibility Matrix

Because the declared peer range spans three Astro majors, prove it.

At minimum:

```text
Astro 5.14/5.x latest supported
Astro 6.x
Astro 7.2/current 7.x
```

Each fixture should install the **packed tarball**, not the source workspace, and check:

```astro
---
import { Acorn } from "@ravenhill/astro-icons";
import { SomeApprovedCustomIcon } from "@ravenhill/astro-icons/custom";
import { Acorn as PhosphorAcorn } from "@ravenhill/astro-icons/phosphor";
---

<Acorn />
<PhosphorAcorn />
<SomeApprovedCustomIcon />
```

Astro documents that SVG imports are usable as Astro components and are inlined into the generated HTML.
([Astro Documentation][5])

If Astro 5.14 or 6 fails, **narrow the peer range** rather than weakening the tests.

## High-Value Additional Invariant

Verify that every `.svg` specifier referenced by built JavaScript exists in the tarball.

This catches the subtle class of failure:

```text
generated export remains
        +
asset was excluded
        =
valid JS file referring to missing SVG
```

## Acceptance Criteria

- Unit tests pass without building.
- Integration tests operate on freshly generated artifacts.
- `publint` passes.
- `attw` reports no unsupported package/type defects.
- Exact pack contract passes.
- Root and both subpath exports resolve.
- Consumer fixtures install from the tarball.
- Every declared supported Astro major builds successfully.
- Every packaged public SVG import resolves.
- No test depends on a registry publication.

## Non-Goals

- Do not test every one of ~1,500 icons by rendering an Astro page.
- Do not snapshot whole generated bundles.
- Do not mock pure functions.
- Do not add mutation testing to the initial release gate.

## Suggested Execution Order

Complete before release automation.

---

# Milestone 4 — Establish Reproducible CI/CD and Immutable Release Artifacts

## Goal

Make CI verify once and publish **the exact bytes that passed verification**.

This is the largest architectural improvement over the original release pipeline, which rebuilds/checks and then invokes
publication in the tag job.

## Pipeline Architecture

Use:

```text
verify
  |
  v
package
  |
  +----------+
  |          |
  v          v
consumer    artifact checks
  \          /
   \        /
    v      v
     publish
        |
        v
   GitLab release
```

### Verify

```text
bun install --frozen-lockfile
bun run format:check
bun run lint
bun run test
bun run typecheck
bun run generate:check
```

### Package

```text
bun run build
bun pm pack
```

Persist the `.tgz` as a GitLab job artifact.

### Artifact Verification

Run against that `.tgz`:

```text
publint
attw
pack-contract
```

### Consumer Matrix

Install that **same `.tgz`** into the Astro compatibility fixtures.

### Publish

On protected SemVer tags only:

1. retrieve the verified tarball;
2. verify:

```text
CI_COMMIT_TAG == "v" + package.json.version
```

3. configure GitLab registry auth via `CI_JOB_TOKEN`;
4. publish the already-packed tarball.

Bun supports publishing an existing tarball directly, and in that mode does not rerun packing lifecycle scripts. That
makes it a strong fit for build-once/verify-once/publish-same-bytes releases. ([Bun][11])

For example:

```sh
bun publish ./artifacts/ravenhill-astro-icons-0.1.0.tgz
```

GitLab supports project npm-registry publication from CI using `CI_PROJECT_ID` and `CI_JOB_TOKEN`. ([GitLab Docs][12])

## GitLab Release Creation

Prefer GitLab's declarative `release:` CI keyword over manually scripting:

```sh
glab release create ...
```

GitLab documents the `release` job keyword and executes it only after the job's main script succeeds.
([GitLab Docs][13])

Because the release keyword needs `glab` available, use a separate final release-metadata job with the official GitLab
CLI container rather than installing `glab` dynamically into the Bun publication container. ([GitLab Docs][14])

Conceptually:

```yaml
publish:
    image: oven/bun:1.3.14
    stage: release
    # publish verified tgz

gitlab-release:
    image: registry.gitlab.com/gitlab-org/cli:<pinned-version-or-digest>
    stage: release
    needs: [publish]
    release:
        tag_name: $CI_COMMIT_TAG
        name: "Release $CI_COMMIT_TAG"
        description: CHANGELOG_RELEASE.md
```

Pin the CLI container to an immutable release or digest when implementing rather than retaining `:latest`.

## Acceptance Criteria

- Branch pipelines never publish.
- Only protected SemVer tag pipelines can publish.
- Tag and `package.json.version` must match.
- CI installs from a frozen lockfile.
- Bun version is pinned.
- Artifact verification consumes the same tarball later published.
- Consumer tests consume that same tarball.
- Package-registry authentication uses short-lived CI credentials.
- GitLab release creation occurs only after successful registry publication.
- CI does not dynamically download arbitrary release tools.

## Non-Goals

- Do not introduce `semantic-release` yet.
- Do not auto-bump package versions.
- Do not publish merge requests.
- Do not repack during the publish stage.
- Do not use long-lived personal tokens unless GitLab job-token capabilities prove insufficient.

## Suggested Execution Order

Only after the exact same local verification pipeline passes.

---

# Milestone 5 — Document, Release, and Verify `v0.1.0`

## Goal

Make the standalone project independently understandable, then execute and verify the first release.

## Scope

README:

- package purpose;
- supported Astro versions;
- GitLab registry configuration;
- Bun installation;
- root and subpath imports;
- attribution/licensing;
- adding an icon;
- generation/build/check commands;
- release workflow.

Maintainer documentation should additionally explain:

```text
inventory evidence
        ↓
release decision
        ↓
generated public surface
        ↓
packed artifact
```

and clearly state that internal/source availability is not automatically publication eligibility.

## Release Readiness BDD

```gherkin
Feature: Initial release readiness

Scenario: Version and tag agree
  Given package.json declares 0.1.0
  When tag v0.1.0 enters the release pipeline
  Then publication may proceed

Scenario: Tag and package version disagree
  Given package.json declares 0.1.0
  When tag v0.1.1 enters the release pipeline
  Then publication fails before registry mutation

Scenario: Published package is consumer-valid
  Given v0.1.0 has been published
  When a clean consumer installs that registry version
  Then supported public imports resolve
  And Astro builds successfully
```

## Release

After all preceding gates pass:

```sh
git tag v0.1.0
git push origin v0.1.0
```

Do not manually run a second local publish.

The tag pipeline is the publication authority.

## Post-Publish Verification

Verify:

- package version exists in GitLab registry;
- GitLab release exists;
- registry tarball contains the same required package surface;
- consumer smoke test succeeds against the registry artifact;
- license/attribution files are visible in the package;
- source/config/migration internals are absent.

## Acceptance Criteria

- README contains no monorepo-only assumptions.
- Compatibility range is documented from evidence.
- `v0.1.0` tag exists.
- GitLab npm package `0.1.0` exists.
- GitLab release exists.
- Registry package matches the verified contract.
- Post-publish Astro smoke test succeeds.
- Migration of `astro-website` remains a separate follow-up.

## Non-Goals

- Do not migrate `astro-website`.
- Do not release `1.0.0`.
- Do not add new icon content during stabilization.
- Do not expand to React/Vue/Svelte.
- Do not automate version selection yet.

## Suggested Execution Order

Final milestone.

---

# Testing-Technique Decision

| Technique                   | Recommendation                                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **BDD**                     | Primary style for policy, packaging, release, and consumer scenarios                                                                       |
| **DDT**                     | Strongly use for filename/export conversion, package entry points, blocked paths, release-policy matrices, and Astro-version compatibility |
| **PBT**                     | Conditional; useful for arbitrary filename normalization/sharding invariants, otherwise unnecessary for the finite audited corpus          |
| **Mock testing**            | Use sparingly at process/filesystem/GitLab boundaries; prefer injected adapters                                                            |
| **Metamorphic testing**     | Strong fit for ordering invariance, deterministic generation, irrelevant-record additions, and set equality                                |
| **Differential testing**    | Not necessary for the release-policy core; `publint` + `attw` do provide useful independent package-analysis perspectives                  |
| **Mutation testing**        | Valuable later for release-policy predicates and set membership, but not worth adding to the `v0.1.0` critical path                        |
| **Fuzz testing**            | Defer unless the project later accepts arbitrary/untrusted manifests or filenames                                                          |
| **Consumer contract tests** | Essential; test the actual tarball with real supported Astro versions                                                                      |
| **Reproducibility testing** | Essential; same inputs must generate identical source plans and the release must publish the verified tarball                              |

---

# Recommended Quality Gate

The standalone repository's canonical local/CI check should converge toward:

```text
install --frozen
        ↓
Biome format/lint
        ↓
unit + policy tests
        ↓
TypeScript 6 typecheck
        ↓
generated-source freshness
        ↓
build
        ↓
pack once
        ↓
exact pack contract
        ↓
publint
        ↓
arethetypeswrong
        ↓
Astro 5/6/7 consumer matrix
```

Then, on an eligible tag:

```text
verified .tgz
     ↓
version/tag assertion
     ↓
GitLab package registry
     ↓
GitLab release metadata
```

That gives the migration a much stronger invariant than the original design:

> **The bytes published to the registry are the exact bytes whose package contract, TypeScript surface, licensing
> surface, and supported Astro consumers were already verified.**

That would be the central architectural goal I would optimize the revised migration around.

[1]: https://github.com/oven-sh/bun/releases?utm_source=chatgpt.com "Releases · oven-sh/bun"
[2]: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html?utm_source=chatgpt.com "Documentation - TypeScript 6.0"
[3]: https://astro.build/blog/astro-720/?utm_source=chatgpt.com "Astro 7.2"
[4]: https://biomejs.dev/blog/?utm_source=chatgpt.com "Blog | Biome"
[5]: https://docs.astro.build/en/guides/images/ "Images | Docs"
[6]: https://bun.sh/docs/pm/cli/install?utm_source=chatgpt.com "bun install"
[7]: https://nodejs.org/api/packages.html?utm_source=chatgpt.com "Modules: Packages | Node.js v26.5.0 Documentation"
[8]: https://docs.gitlab.com/user/packages/npm_registry/ "npm packages in the package registry | GitLab Docs"
[9]: https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/packages/cli/README.md?utm_source=chatgpt.com "README.md - arethetypeswrong CLI"
[10]: https://bun.sh/docs/test/mocks?utm_source=chatgpt.com "Mocks"
[11]: https://bun.sh/docs/pm/cli/publish?utm_source=chatgpt.com "bun publish"
[12]: https://docs.gitlab.com/user/packages/npm_registry/?utm_source=chatgpt.com "npm packages in the package registry"
[13]: https://docs.gitlab.com/user/project/releases/?utm_source=chatgpt.com "Releases | GitLab Docs"
[14]: https://docs.gitlab.com/user/project/releases/release_cicd_examples/?utm_source=chatgpt.com "Release CI/CD examples"
