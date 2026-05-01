# [PLAN] Layer Separation Hardening

> **Closed on 2026-05-01.** Cycles 1-5 are complete. This file is now a historical implementation plan and includes some intermediate assumptions that were superseded during the work. The current source of truth for enforced boundaries is [`docs/architecture/layer-separation.md`](../docs/architecture/layer-separation.md).

Final closure verification:

```bash
pnpm check
```

Result: passed, including `pnpm check:architecture` with no layer boundary findings.

## Summary

Harden the existing `astro-website` layered architecture by making dependency boundaries executable, documented, and regression-tested.

This phase does **not** redesign the package structure. It preserves the current intended flow:

```txt
Presentation -> Application -> Domain
Infrastructure -> Domain/Application contracts
Presentation adapters -> Application services + Infrastructure adapters
```

The work focuses on:

* preventing accidental cross-layer imports;
* making intentional exceptions explicit and reviewable;
* moving UI-facing code away from direct domain/application imports when those imports are not composition boundaries;
* documenting the enforced architecture as the source of truth for future contributors.

No user-facing site behavior should change.

---

## Architectural Rules

### Domain

`src/domain/**` is the innermost layer.

It may import:

* other domain modules;
* small shared type-only utilities only if they are demonstrably framework-free.

It must not import:

* Astro or React;
* `src/application/**`;
* `src/infrastructure/**`;
* `src/presentation/**`;
* `src/components/**`;
* `src/layouts/**`;
* `src/pages/**`;
* generated JSON/JSON-LD datasets;
* `zod`;
* browser APIs;
* filesystem or build-time loading code.

### Application

`src/application/**` coordinates use cases and depends inward.

It may import:

* `src/domain/**`;
* application-local contracts, DTOs, and services.

It must not import:

* Astro or React;
* UI components;
* generated datasets;
* concrete infrastructure adapters;
* `zod`;
* filesystem/build-time loaders;
* presentation code.

### Infrastructure

`src/infrastructure/**` provides concrete adapters.

It may import:

* domain contracts and domain types;
* application ports/contracts when implementing application-facing adapters;
* concrete data sources;
* generated datasets;
* validation/loading utilities when needed.

It must not import:

* Astro components;
* layouts;
* pages;
* presentation adapters;
* UI-only helpers.

### Presentation adapters

`src/presentation/adapters/**` is the accepted local composition boundary.

It may import:

* application services;
* application DTOs;
* infrastructure adapters;
* presentation-local mapping helpers.

It should expose stable, UI-friendly APIs such as:

```ts
resolveAutoNav(pathname, lessons)
resolveLessonMetadata(pathname)
```

It must not leak infrastructure types to UI consumers unless they are already stable public payloads.

### UI surfaces

These paths are UI-facing:

```txt
src/components/**
src/layouts/**
src/pages/**
```

They should use presentation adapters for layered use cases.

They must not import infrastructure directly.

Direct domain/application imports are allowed only when the imported item is a deliberately UI-facing value object, type, or pure formatting contract. These cases should be rare and documented.

---

## Explicit Exceptions

Keep exceptions centralized in the boundary checker allowlist and mirrored in `docs/architecture/layer-separation.md`.

Current accepted exceptions:

### `src/utils/lesson-metadata.ts`

Treat as infrastructure support for generated metadata loading and validation.

This file may import generated metadata and validation dependencies, but consumers should eventually access metadata through presentation/application boundaries instead of reaching into this utility directly.

### `src/components/ui/references/reference-content.ts`

Treat as an Astro/UI slot adapter.

It may use Astro-facing slot/content conventions because its responsibility is to adapt component content, not to participate in domain/application orchestration.

### `src/utils/navigation.ts`

Treat as a presentation payload normalization helper.

It may remain outside `src/presentation` temporarily, but the architecture note should document whether it is:

* intentionally shared presentation infrastructure; or
* a migration candidate into `src/presentation`.

Add a follow-up decision point for this file rather than leaving its status vague.

---

## Key Changes

### 1. Add an architecture boundary checker

Create:

```txt
scripts/check-layer-boundaries.mjs
```

The checker should:

* scan `.ts`, `.tsx`, and `.astro` files under `src`;
* detect static imports;
* detect re-exports;
* optionally detect dynamic imports when the target is a string literal;
* resolve project aliases such as `~`, `$domain`, `$application`, `$utils`, if used;
* normalize relative paths before rule evaluation;
* report infringements with:

  * source file;
  * imported target;
  * resolved target, when available;
  * violated rule;
  * suggested fix category.

Example violation output:

```txt
Layer boundary violation

Source:
  src/components/foo/Foo.astro

Import:
  ~/infrastructure/lesson-metadata/LessonMetadataAdapter

Rule:
  UI surfaces must not import infrastructure directly.

Suggested fix:
  Move access behind src/presentation/adapters or consume an existing presentation adapter.
```

### 2. Keep the rule engine data-driven

Avoid hardcoding each rule in scattered conditionals.

Use a small declarative rule table such as:

```ts
{
  layer: "domain",
  sources: ["src/domain/**"],
  forbiddenTargets: [
    "src/application/**",
    "src/infrastructure/**",
    "src/presentation/**",
    "src/components/**",
    "src/layouts/**",
    "src/pages/**",
  ],
  forbiddenPackages: ["astro", "react", "zod"],
}
```

This keeps the checker easier to extend when new architectural surfaces appear.

### 3. Centralize allowlisted exceptions

Create one allowlist structure inside the checker, for example:

```ts
const allowedExceptions = [
  {
    source: "src/components/ui/references/reference-content.ts",
    target: "astro",
    reason: "Astro/UI slot adapter.",
  },
]
```

Each exception should include:

* source pattern;
* target pattern;
* reason;
* optional expiry/migration note.

Do not scatter exceptions inside rule predicates.

### 4. Audit existing imports before refactoring

Run the checker against the current repository and classify each finding as:

* **true violation**: should be fixed in this phase;
* **documented exception**: should remain allowlisted;
* **rule too broad**: should refine the checker;
* **migration candidate**: should be documented but not necessarily fixed in this phase.

Avoid broad refactors until the checker proves the coupling is real.

### 5. Move small coupling gaps behind presentation adapters

Where UI code imports domain/application directly for a full use case, move access behind `src/presentation/adapters`.

Examples of likely fixes:

* UI calls an application service directly → expose through a presentation adapter.
* UI imports infrastructure adapter directly → compose it inside a presentation adapter.
* UI imports domain formatting logic that is really display-specific → move formatting to presentation.
* UI imports a domain type only for props → keep only if it is stable, intentional, and documented.

Do not refactor reference components unless the checker reveals a violation beyond their documented adapter role.

### 6. Add package scripts and CI integration

Add:

```json
{
  "scripts": {
    "check:architecture": "node scripts/check-layer-boundaries.mjs"
  }
}
```

Then include it in the main check pipeline:

```json
{
  "scripts": {
    "check": "pnpm check:types && pnpm check:astro && pnpm check:architecture"
  }
}
```

Adjust the exact script names to match the current repository conventions.

---

## TDD Cycles

### ~~Cycle 1: Boundary checker foundation~~

Goal: prove the checker can scan imports and report infringements accurately.

Add fixture-based tests covering:

* relative imports;
* alias imports;
* bare package imports;
* type-only imports;
* re-exports;
* `.astro` frontmatter imports;
* dynamic string-literal imports, if supported.

Implement:

* file discovery;
* import extraction;
* path normalization;
* alias resolution;
* basic violation reporting.

Acceptance criteria:

* the checker reports source file, import target, resolved target, and violated rule;
* the checker exits with non-zero status when infringements exist;
* the checker exits with zero status when no infringements exist.

---

### ~~Cycle 2: Data-driven layer rules~~

Goal: encode the architecture as a readable rule matrix.

Add DDT cases for:

| Source layer          | Allowed targets                             | Forbidden targets                                                   |
| --------------------- | ------------------------------------------- | ------------------------------------------------------------------- |
| Domain                | Domain                                      | Application, Infrastructure, Presentation, UI, Astro, React, Zod    |
| Application           | Domain, Application                         | Infrastructure, Presentation, UI, Astro, React, Zod, generated data |
| Infrastructure        | Domain, Application contracts, data sources | Presentation, UI                                                    |
| Presentation adapters | Application, Infrastructure                 | UI components, pages, layouts                                       |
| UI surfaces           | Presentation adapters, UI helpers           | Infrastructure directly                                             |

Implement:

* declarative rule groups;
* layer detection from source path;
* target classification;
* package classification;
* centralized allowlist handling.

Acceptance criteria:

* each forbidden direction has at least one failing fixture;
* each allowed direction has at least one passing fixture;
* exceptions are visible in test output or fixture names.

---

### ~~Cycle 3: Repository audit~~

Goal: run the checker on the real `src` tree and turn findings into decisions.

Steps:

1. Run:

   ```bash
   pnpm check:architecture
   ```

2. Classify every finding.

3. Fix clear infringements.

4. Add allowlist entries only for intentional exceptions.

5. Update:

   ```txt
   docs/architecture/layer-separation.md
   ```

The architecture note should include:

* the allowed dependency flow;
* the role of each layer;
* examples of valid imports;
* examples of invalid imports;
* the exception list;
* how to run the checker;
* how to add a justified exception.

Acceptance criteria:

* the current repository passes `pnpm check:architecture`;
* every exception has a reason;
* no violation is hidden by a broad wildcard unless the reason is documented.

---

### ~~Cycle 4: Close small coupling gaps~~

Goal: remove accidental UI-to-domain/application/infrastructure coupling revealed by the checker.

Prioritise fixes in this order:

1. UI importing infrastructure directly.
2. UI constructing application services directly.
3. UI importing generated datasets directly.
4. UI importing domain logic for display-only concerns.
5. Ambiguous utilities under `src/utils`.

Possible refactors:

* add or extend presentation adapters;
* move presentation-specific mapping into `src/presentation`;
* expose serializable DTOs instead of rich internal objects;
* split mixed utilities into infrastructure support and presentation normalization modules.

Acceptance criteria:

* no new public site behavior;
* existing presentation APIs remain stable;
* UI payloads stay serializable and minimal;
* imports reflect the intended layer flow.

---

### ~~Cycle 5: CI and developer workflow integration~~

Goal: make boundary infringements hard to miss.

Add:

```bash
pnpm check:architecture
```

Wire it into:

```bash
pnpm check
```

Ensure CI runs the same command.

Update contributor-facing documentation with:

```bash
pnpm check:architecture
```

Acceptance criteria:

* local checks fail on boundary infringements;
* CI fails on boundary infringements;
* error messages are actionable enough to fix the import without reading the checker source.

---

## Public Interfaces

No user-facing behavior should change.

Existing presentation APIs should remain stable:

```ts
resolveAutoNav(pathname, lessons)
resolveLessonMetadata(pathname)
```

Add one developer-facing command:

```bash
pnpm check:architecture
```

No production runtime dependency should be introduced for the checker.

---

## Test Plan

Run the full validation set:

```bash
pnpm test:unit
pnpm test:astro
pnpm check:architecture
pnpm check
```

Checker-specific tests should cover:

* allowed imports;
* forbidden imports;
* package-level restrictions;
* alias resolution;
* relative path normalization;
* `.astro` import extraction;
* re-export detection;
* allowlisted exceptions;
* violation reporting format;
* non-zero exit on infringements.

Use DDT for the layer matrix.

Consider lightweight property-style tests for path normalization only if the existing test stack already supports it cleanly. This is useful for proving that equivalent paths such as these classify identically:

```txt
src/domain/foo.ts
src/domain/../domain/foo.ts
src/application/../domain/foo.ts
```

Do not add PBT just for ceremony.

---

## Implementation Notes

### Import extraction

A small Node script is acceptable, but avoid a fragile regex-only implementation if `.astro` and TypeScript syntax make it unreliable.

Recommended options:

1. **Minimal dependency route**

   * Use Node filesystem traversal.
   * Extract imports with careful handling for:

     * `import ... from "..."`;
     * `import "..."`;
     * `export ... from "..."`;
     * `await import("...")`;
     * Astro frontmatter fences.

2. **More robust route**

   * Use a parser-oriented dependency such as `es-module-lexer` for JS/TS extraction.
   * Keep custom handling only for Astro frontmatter.

The plan can start with the minimal route, but the tests should be strict enough that a parser dependency can be introduced later without changing checker behavior.

### Alias resolution

The checker should understand the aliases actually used by the project.

At minimum, support:

```txt
~
$domain
$application
$utils
```

Prefer deriving aliases from `tsconfig.json` when practical. If that is too much for this phase, keep the alias table local, explicit, and tested.

### Type-only imports

Do not automatically ignore `import type`.

A type-only import can still create architectural coupling because it exposes an internal layer shape to another layer.

Allow type-only imports only when the rule table explicitly permits them.

### Generated data

Generated JSON/JSON-LD imports should be treated as infrastructure/data-source access.

That means:

* allowed in infrastructure support;
* forbidden in domain;
* forbidden in application;
* generally forbidden in UI unless explicitly mediated by a presentation adapter.

---

## Risks and Mitigations

### Risk: checker becomes too broad and blocks valid work

Mitigation:

* keep rules data-driven;
* add precise exceptions with reasons;
* test allowed examples, not only forbidden examples.

### Risk: exceptions become a dumping ground

Mitigation:

* require every exception to include a reason;
* document exceptions in the architecture note;
* avoid wildcard source/target pairs unless unavoidable;
* add expiry notes for migration exceptions.

### Risk: regex import parsing misses real imports

Mitigation:

* test `.astro`, re-exports, bare imports, and dynamic imports;
* consider `es-module-lexer` if the minimal parser becomes brittle.

### Risk: architecture check duplicates existing lint tooling

Mitigation:

* keep this checker focused only on project-specific layer rules;
* do not turn it into a general linter;
* keep output concise and actionable.

---

## Assumptions

* The goal is to harden the current architecture, not redesign it.
* Presentation adapters remain the accepted composition boundary between UI and application/infrastructure.
* Historical Phase 0/1 documents remain historical unless explicitly updated.
* No runtime dependency is required.
* A small development dependency is acceptable only if it materially improves correctness or maintainability of import parsing.
* The checker should prefer false positives that are easy to allowlist over false negatives that let architectural drift accumulate.
