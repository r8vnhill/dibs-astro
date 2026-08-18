# Milestone 4 — Migrate DIBS to the published `@ravenhill/astro-semantics`

## Goal

Migrate `astro-website` from its local paragraph implementation to the published `@ravenhill/astro-semantics@0.1.0`
artifact while preserving the site's existing observable behavior and current `P` consumer API.

At completion, the dependency path must be:

```text
astro-website
    ↓
local semantics barrel
    ↓
P compatibility alias
    ↓
@ravenhill/astro-semantics@0.1.0
    ↓
canonical GitLab npm registry
    project 85449745
```

There must be no production fallback to:

- `src/components/semantics/P.astro`;
- a workspace package;
- a `file:` or `link:` dependency;
- an `astro-semantics` sibling checkout;
- an unpublished package copy.

The migration is **behavior-preserving**. Renaming consumers from `P` to `Paragraph` is deliberately deferred.

---

# Scope

## In scope

- canonical-registry availability of `@ravenhill/astro-semantics@0.1.0`;
- `astro-website/package.json`;
- `astro-website/pnpm-lock.yaml`;
- the existing local semantics barrel;
- current paragraph characterization/type tests;
- temporary differential migration fixtures;
- HTML-semantic validation;
- Playwright/browser behavior relevant to paragraph rendering;
- clean-checkout installation and production/container verification.

## Observable contracts to preserve

The migration must preserve:

- `<p>` semantics;
- slotted content;
- supported global HTML attributes;
- `class` forwarding;
- `lang` and `dir`;
- `aria-*` and `data-*` forwarding;
- current computed vertical spacing;
- absence of client-side hydration/runtime JavaScript for the component;
- valid paragraph content models in existing consumers.

Implementation-specific Astro scope attributes or generated CSS identifiers are **not** part of the equivalence
contract.

---

# Prerequisite gate — Prove the published artifact exists

This is a prerequisite, not part of the DIBS source migration.

Do **not** modify `package.json`, the lockfile, or the semantics barrel until the published package can be consumed from
the canonical registry.

## Required evidence

Confirm that:

```text
@ravenhill/astro-semantics@0.1.0
        ↓
GitLab npm project 85449745
        ↓
metadata retrievable
        ↓
tarball retrievable
        ↓
package identity = @ravenhill/astro-semantics@0.1.0
```

Also confirm that the registry's governance state regards the package as `active`, rather than merely `planned`, if that
lifecycle is already authoritative.

Use the published artifact itself as evidence; the existence of a source tag or successful source build is insufficient.

## Blocked state

If `0.1.0` is not yet available from project `85449745`:

- stop this milestone before modifying DIBS dependency state;
- complete publication and post-publication verification in `astro-semantics`;
- update registry governance from `planned` to `active` only when its registry contract is satisfied;
- then resume Milestone 4.

Do not temporarily point DIBS at a sibling checkout or alternate registry to continue the migration.

## Acceptance criteria

- `0.1.0` is retrievable from project `85449745`;
- package metadata reports the expected name and version;
- the published artifact passes the release contract owned by `astro-semantics`;
- DIBS can proceed without a local substitute.

---

# TDD cycle 1 — Characterize the current DIBS compatibility contract

## Goal

Establish a migration baseline against the **current local implementation** before changing its source.

## Red

Extend or redirect the existing paragraph characterization suite so that it exercises the same public seam used by
production consumers.

Use BDD-style, data-driven cases for at least:

| Case           | Contract                            |
| -------------- | ----------------------------------- |
| plain slot     | content remains inside one `<p>`    |
| `id` / `title` | global attributes are forwarded     |
| custom class   | caller class remains present        |
| `lang`         | language attribute is preserved     |
| `dir`          | directionality is preserved         |
| `aria-*`       | accessibility metadata is forwarded |
| `data-*`       | caller metadata is forwarded        |

Retain compile-time/type characterization for the supported paragraph attribute surface.

Add or retain an HTML-semantic check over existing consumers to demonstrate that none currently places block content
where a paragraph requires phrasing content.

If that audit discovers a real semantic defect, treat its repair as an explicit prerequisite/follow-up rather than
silently changing behavior during the library migration.

## Green

Make only the minimum test-fixture changes necessary to characterize the current implementation.

No production implementation changes occur yet.

## Refactor

Centralize canonical paragraph test cases so the same input matrix can be reused by the differential cycle rather than
duplicating fixtures.

## Acceptance criteria

- the pre-migration local implementation satisfies the documented characterization suite;
- the type contract is executable;
- existing paragraph consumers pass HTML-semantic validation;
- no test depends unnecessarily on private component implementation details.

---

# TDD cycle 2 — Install the exact published package through the canonical registry

## Goal

Make the published tarball, rather than a local source tree, an actual dependency of DIBS.

## Red

Add a dependency-boundary contract that fails until all of the following are true:

```text
declared version = 0.1.0
resolved registry project = 85449745
resolution is not workspace:
resolution is not file:
resolution is not link:
```

The check should inspect package-manager state/lockfile data structurally where practical instead of depending on a
fragile text substring alone.

## Green

Install with an exact version:

```text
@ravenhill/astro-semantics = 0.1.0
```

Update:

```text
package.json
pnpm-lock.yaml
```

using the existing scoped GitLab registry configuration.

Do not alter unrelated dependency versions.

## Refactor

Keep the registry identity in the existing canonical `.npmrc` configuration rather than duplicating the project endpoint
through additional scripts or environment variables unless the current package-manager setup requires them.

## Clean-install contract

Verify from an environment with:

- empty `node_modules`;
- an isolated/empty pnpm store;
- no sibling `astro-semantics` checkout dependency;
- no user-level npm configuration influencing resolution;
- `--frozen-lockfile`.

The test should prove that the package manager obtains `0.1.0` through the canonical registry.

If the existing DIBS CI uses an ephemeral GitLab credential, preserve that authentication model during this milestone.
Changing registry authentication policy is a separate concern.

## Acceptance criteria

- `package.json` declares exactly `0.1.0`;
- the lockfile resolves the package through project `85449745`;
- no local/workspace resolution exists;
- a clean frozen-lockfile installation succeeds;
- no unrelated lockfile changes are introduced.

---

# TDD cycle 3 — Prove local/published behavioral equivalence

## Goal

Compare the old local implementation directly with the **installed published artifact** before switching production
consumers.

## Test architecture

Temporarily render:

```text
legacy local P.astro
        ↘
         same canonical cases
        ↗
published Paragraph
```

Both sides must run in the same DIBS style environment.

The temporary differential fixture must not become a production route. Remove or exclude it before the final production
build.

## Red

Create data-driven differential cases covering:

- plain slot content;
- multiline/inline phrasing content;
- global attributes;
- custom classes;
- `lang`;
- `dir`;
- `aria-*`;
- `data-*`;
- representative existing paragraph usage.

If any existing consumer relies on a spacing-related utility/class override, include that behavior explicitly instead of
assuming it.

## Define equivalence semantically

Do **not** require byte-identical raw Astro HTML.

The old and published components are equivalent when they produce the same externally relevant behavior:

```text
same element semantics
same slot content
same caller-visible attributes
same caller-supplied classes
same accessibility-relevant attributes
same computed spacing
no client hydration/runtime
```

Ignore implementation-owned differences such as:

- Astro scoped-style attributes;
- generated CSS identifiers;
- CSS ordering that does not change computed behavior.

## Browser differential contract

Use Playwright in the real site styling environment and compare at least:

```text
getComputedStyle(legacy).marginBlockStart
    ==
getComputedStyle(published).marginBlockStart

getComputedStyle(legacy).marginBlockEnd
    ==
getComputedStyle(published).marginBlockEnd
```

Prefer direct differential comparison to hardcoding a pixel value, since the contract is equivalence under the site's
actual root/style environment.

Also check that changing theme, if the site supports multiple themes, does not unexpectedly change paragraph spacing.

## Green

If a difference appears, determine ownership before changing code:

- library defect → fix/release in `astro-semantics`;
- incorrect characterization → correct the test;
- intentional semantic change → defer to a separately approved change.

Do not compensate inside DIBS with package-specific CSS unless that behavior is explicitly intended as a site override.

## Refactor

Once the comparison is green:

- keep durable behavioral cases;
- remove migration-only duplication where it no longer provides value;
- retain enough evidence in the milestone/traceability record to identify the package version and tests used for the
  comparison.

## Acceptance criteria

- old and published components are semantically equivalent under the canonical case matrix;
- computed vertical spacing is equivalent in a real browser;
- caller attributes/classes behave equivalently;
- no hydration/runtime behavior appears;
- differences in generated Astro internals are not incorrectly treated as public regressions.

---

# TDD cycle 4 — Switch the compatibility seam to the published component

## Goal

Change exactly one production boundary while leaving all existing `P` consumers untouched.

## Red

Run the characterization, type, HTML, and browser suites through the existing local semantics barrel.

They should currently describe the behavior that must survive the implementation switch.

## Green

Change the barrel from the local component to:

```ts
export { Paragraph as P } from "@ravenhill/astro-semantics";
```

Do **not** bulk-edit consumer imports.

The resulting dependency graph becomes:

```text
existing consumer
    ↓
P
    ↓
local semantics barrel
    ↓
published Paragraph
```

## Refactor

Ensure tests import through the same compatibility boundary where the purpose is to test DIBS behavior.

Tests specifically validating the external package boundary may import `Paragraph` directly.

Do not create a second wrapper component unless DIBS genuinely needs site-specific behavior. A pure re-export is the
smaller and more transparent compatibility seam.

## Acceptance criteria

- all existing `P` call sites remain unchanged;
- static/type checks remain green;
- render characterization remains green;
- HTML-semantic validation remains green;
- browser spacing remains green;
- no site-specific wrapper duplicates `Paragraph`.

---

# TDD cycle 5 — Remove the local implementation and prove single-source ownership

## Goal

Remove the obsolete DIBS implementation only after the published component has passed every migration contract.

## Preconditions

All previous cycles must be green.

In particular:

```text
published dependency available      ✓
clean canonical install             ✓
differential behavior               ✓
browser spacing equivalence         ✓
barrel switched                     ✓
HTML semantics                      ✓
```

## Green

Delete:

```text
src/components/semantics/P.astro
```

Remove tests or fixtures that exist solely to exercise the deleted implementation.

Do **not** remove durable consumer-contract tests.

## Refactor

Search for:

- direct imports of the old `P.astro`;
- duplicate paragraph implementations;
- obsolete migration fixtures;
- stale comments/documentation referring to the local implementation.

Keep the compatibility alias `P`.

A repository-topology assertion that forbids a second production paragraph implementation is optional; add it only if
there is a realistic risk of the duplicate implementation returning.

## Acceptance criteria

- `src/components/semantics/P.astro` no longer exists;
- the semantics barrel is the only local compatibility seam;
- no production import references the removed file;
- durable characterization tests continue to exercise the published implementation.

---

# TDD cycle 6 — Prove the complete DIBS delivery path

## Goal

Demonstrate that migrating the component source did not change the site's build, rendered output, deployment behavior,
or package-resolution reproducibility.

## Verification order

Run from a clean checkout in this order:

```text
1. frozen clean dependency installation
        ↓
2. dependency-resolution contract
        ↓
3. static/type checking
        ↓
4. component/render tests
        ↓
5. HTML-semantic validation
        ↓
6. browser paragraph contract
        ↓
7. full Playwright suite
        ↓
8. production build
        ↓
9. container HTTP contract
        ↓
10. container/browser contract
        ↓
11. full GitLab pipeline
```

Fail early on dependency-resolution problems before spending time on higher-level tests.

## Clean dependency evidence

The final CI evidence should establish:

```text
package.json
    exact 0.1.0
        ↓
pnpm-lock.yaml
    canonical project 85449745
        ↓
clean pnpm install --frozen-lockfile
        ↓
installed @ravenhill/astro-semantics@0.1.0
```

The lockfile/package manager should be the dependency-resolution authority. Do not add a copied package tarball to the
website merely as additional evidence.

## Traceability

Record, where the project's existing traceability format supports it:

- exact package version;
- canonical registry project;
- relevant lockfile integrity/resolution;
- differential/browser verification commands;
- final commit;
- final successful pipeline.

Do not mark the milestone complete while required evidence remains deferred.

## Acceptance criteria

- clean installation succeeds with the canonical published dependency;
- `astro check` and TypeScript/static checks pass;
- all relevant unit/render/HTML tests pass;
- browser equivalence contract passes;
- full Playwright passes;
- production build passes;
- container HTTP/browser contracts pass;
- final GitLab pipeline for the completed commit is green.

---

# Testing-style disposition

The project guidelines require considering the full assurance toolbox while using each technique only where its value
justifies its complexity.

| Technique                    | Decision                             | Application                                                                                                     |
| ---------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Example-based / BDD          | **Required**                         | `P` consumer behavior, dependency boundary, regression cases                                                    |
| DDT                          | **Required**                         | Forwarded attributes, content cases, differential render matrix                                                 |
| PBT                          | **Not justified here**               | Paragraph contract has a small, explicit state space                                                            |
| Differential testing         | **Required during migration**        | Local `P` vs published `Paragraph`                                                                              |
| Metamorphic testing          | **High value**                       | Theme changes should not alter spacing; unrelated forwarded attributes should not alter paragraph semantics     |
| Mutation testing             | **Not justified for this milestone** | Alias/migration logic is too small; package internals own their own assurance                                   |
| Fuzz testing                 | **Not justified**                    | No new parser or untrusted structured-input boundary                                                            |
| Mock testing                 | **Minimize**                         | Prefer real Astro render, real pnpm resolution, and real browser                                                |
| Model-based testing          | **Not needed**                       | No complex state model                                                                                          |
| State-machine testing        | **Not a DIBS concern here**          | Publication state belongs to `astro-semantics`/registry release workflows                                       |
| Contract testing             | **Required**                         | Published package resolution, component behavior, HTML semantics                                                |
| Snapshot/golden              | **Selective**                        | Avoid raw Astro HTML snapshots; normalized fixtures only if they add value                                      |
| Concurrency testing          | **Not applicable**                   | DIBS only reads the immutable package                                                                           |
| Deterministic simulation     | **Low value**                        | Finite differential fixtures are simpler                                                                        |
| Static analysis              | **Required**                         | Astro/TypeScript, package imports, configuration                                                                |
| Symbolic execution           | **Not justified**                    | No relevant complex branching                                                                                   |
| Formal specification         | **Not justified**                    | Explicit component and dependency contracts are sufficient                                                      |
| Runtime assertions           | **Required at package boundary**     | Installed name/version and canonical registry identity                                                          |
| Sanitizer-style tooling      | **Not applicable**                   | No native-memory boundary                                                                                       |
| Cross-version testing        | **Owned primarily by the library**   | DIBS must test its current Astro stack against exact `0.1.0`; the library owns its broader compatibility matrix |
| Browser/E2E                  | **Required**                         | Computed CSS and actual site integration                                                                        |
| Accessibility/HTML semantics | **Required at relevant boundary**    | Valid `<p>` content and preserved semantic attributes                                                           |
| Clean-consumer integration   | **Required**                         | Prove published artifact use instead of workspace/local resolution                                              |

The key assurance combination for this milestone is:

```text
clean package resolution
        +
static contract
        +
differential render
        +
real-browser computed style
        +
production/container integration
```

Each layer observes a different failure mode rather than repeating the same assertion.

---

# Global acceptance criteria

Milestone 4 is complete only when all of the following are true.

## Published dependency

- `@ravenhill/astro-semantics@0.1.0` is available from canonical project `85449745`;
- its registry lifecycle is compatible with production consumption;
- `astro-website/package.json` declares exactly `0.1.0`;
- `pnpm-lock.yaml` resolves that dependency through the canonical registry;
- no `workspace:`, `file:`, `link:`, sibling checkout, or copied implementation satisfies the dependency.

## Compatibility

- existing consumers continue using `P`;
- the local barrel re-exports published `Paragraph` as `P`;
- slotted content and supported attributes remain equivalent;
- actual browser spacing remains equivalent;
- no additional client runtime is introduced.

## Semantic correctness

- current paragraph consumers remain valid HTML;
- no newly introduced block-content/paragraph incompatibility appears;
- accessibility-relevant attributes are preserved.

## Architecture

- `src/components/semantics/P.astro` is removed;
- no second local paragraph implementation replaces it;
- package behavior remains owned by `astro-semantics`;
- DIBS owns only the temporary compatibility alias and its consumer contract.

## Reproducibility and delivery

- a clean frozen-lockfile installation succeeds;
- static, render, HTML, and browser checks pass;
- production build passes;
- container HTTP/browser contracts pass;
- the final GitLab pipeline is green;
- completion evidence records the exact package version and canonical registry source.

---

# Non-goals / deferred work

Explicitly defer:

- renaming existing `P` consumers to `Paragraph`;
- removing the `P` compatibility alias;
- extracting or migrating `Heading`;
- extracting or migrating `Enquote`;
- replacing native `<p>` usage elsewhere;
- changing paragraph visual design or spacing;
- broad semantic-component refactoring;
- changing registry authentication policy;
- changing `astro-semantics` API beyond corrections required to preserve the demonstrated contract;
- upgrading unrelated dependencies or rewriting currently pending site work.

If a genuine behavioral difference is discovered, correct it at its owning layer or open a follow-up; do not silently
encode a compensating DIBS-specific workaround. This preserves the behavior-preserving migration discipline required by
the guidelines.

# Suggested execution order

```text
verify published 0.1.0 in project 85449745
        ↓
        PUBLICATION GATE
        ↓
characterize current local P
        ↓
install exact published dependency
        ↓
prove clean canonical resolution
        ↓
run local ↔ published differential tests
        ↓
prove computed browser spacing
        ↓
        EQUIVALENCE GATE
        ↓
switch barrel to Paragraph as P
        ↓
rerun consumer contracts
        ↓
remove local P.astro
        ↓
remove temporary migration fixtures
        ↓
clean install + static + HTML + browser
        ↓
production build + container contracts
        ↓
fresh final GitLab pipeline
        ↓
record milestone evidence
```

The **minimum useful vertical slice** is:

> A clean checkout installs `@ravenhill/astro-semantics@0.1.0` from project `85449745`, one existing DIBS `P` consumer
> renders through the local compatibility alias using the published `Paragraph`, and its semantic HTML and computed
> spacing match the former local implementation.

Once that slice is green, deleting `P.astro` becomes the final consolidation of an already demonstrated migration rather
than the point at which the migration is first tested.
