# [DONE] Cycle 3: Repository Architecture Audit

## Summary

Audit the real `src/` tree with the executable layer-boundary checker, classify every current boundary finding, and make
the repository pass the architecture gate without broad allowlist entries.

**Status:** Implemented.

The current baseline from:

```bash
node scripts/check-layer-boundaries.mjs
```

reports **14 findings**, all related to `src/data/*` imports from UI or presentation-adapter code.

Final result:

```bash
pnpm check:architecture
```

reports:

```txt
No layer boundary findings found.
```

No allowlist entries were added.

## Audit Result

- Site metadata access now flows through `$presentation/adapters/site-data`.
- Course structure access now flows through `$presentation/adapters/course-navigation` and the existing `LessonCatalogAdapter`.
- Bibliography catalog default access now flows through `$presentation/adapters/bibliography-catalog`.
- Simple static UI data now flows through `$presentation/adapters/static-ui-data`.
- The navigation bridge no longer imports `~/data/course-structure` directly.

This cycle must remove those findings by routing data access through explicit presentation-facing, application-facing,
or infrastructure-backed boundaries. The goal is to preserve public site behaviour while making the dependency structure
match the documented architecture.

## Goals

- Add a package-level architecture check command.
- Remove all current UI and presentation-adapter imports from `src/data/*`.
- Keep boundary rules executable, documented, and aligned with the final code.
- Avoid broad allowlist entries.
- Preserve current rendered behaviour.

## Non-Goals

- Do not redesign the whole architecture checker.
- Do not change public site behaviour.
- Do not introduce changelog updates.
- Do not move unrelated data-loading, rendering, or routing code.
- Do not defer current findings to a later cycle.

## Key Changes

### 1. Add the Architecture Check Script

Add the missing package script:

```json
{
    "scripts": {
        "check:architecture": "node scripts/check-layer-boundaries.mjs"
    }
}
```

After this change, the architecture gate must be runnable with:

```bash
pnpm check:architecture
```

### 2. Establish the Baseline

Before refactoring, run:

```bash
node scripts/check-layer-boundaries.mjs
```

Record the current findings in a short audit note or checklist grouped by source type:

- site metadata access;
- course structure access;
- bibliography catalog access;
- simple static UI data access;
- presentation-adapter data access.

Use the terms **finding**, **issue**, **not allowed**, or **boundary finding**. Avoid using **violation** in new docs,
tests, and comments.

### 3. Refactor Site Metadata Consumers

Refactor direct `src/data/*` imports used by metadata consumers through a narrow presentation-facing boundary.

Affected surface includes:

- `BaseLayout`;
- `LessonMetaPanel`;
- `pages/index`;
- related render tests.

Preferred direction:

- keep UI components focused on rendering;
- expose resolved metadata through a presentation adapter, bridge, or service;
- keep parsing, fallback handling, and dataset ownership outside component bodies.

### 4. Refactor Course Structure Consumers

Refactor direct course-structure imports from UI components.

Affected surface includes:

- `NotesLayout`;
- `LessonSidebar`;
- `LessonTree`;
- related tests.

Preferred direction:

- UI receives navigation/tree data as props or through a presentation-facing query/helper;
- course-structure data remains behind an accepted boundary;
- tests assert rendered behaviour rather than internal import paths.

### 5. Refactor Bibliography Catalog Consumer

Refactor `ReferencesFromCatalog` so it does not import the bibliography catalog directly from `src/data/*`.

Preferred direction:

- route catalog lookup through the existing bibliography parsing/loading abstraction if one already exists;
- otherwise introduce a narrow catalog provider module accepted by the layer rules;
- preserve current reference rendering behaviour and fallback semantics.

### 6. Refactor Simple UI Data Consumers

Refactor simple static data imports used by:

- `NotFound`;
- `ToDo`.

Preferred direction:

- move the data behind small presentation-facing modules, constants, or props;
- avoid creating heavy abstractions for trivial static content;
- keep the solution proportional while still satisfying the boundary rule.

### 7. Fix Presentation Adapter Data Access

Review:

```text
src/presentation/adapters/navigation-bridge.ts
```

It should not import `~/data/course-structure` directly unless the checker explicitly models that dependency as
intentional composition.

Preferred implementation:

- route the concrete course-structure source through an infrastructure adapter, application service, or accepted
  application-facing contract;
- keep `presentation/adapters` as wiring code, not as an owner of raw data modules;
- update tests around navigation composition to lock the intended behaviour.

Only adjust the checker rule if the final architecture intentionally allows this access pattern and the documentation
explains why.

## Allowlist Policy

Do not add wildcard allowlist entries.

Exact allowlist entries are permitted only when a refactor would make the architecture worse, for example by adding
indirection with no useful boundary or by duplicating source ownership.

Each exact exception must include:

- importing module;
- imported module;
- reason;
- expected lifetime: permanent or temporary;
- owner of future removal, if temporary.

Example format:

```js
{
  from: "src/presentation/adapters/example.ts",
  to: "src/data/example.ts",
  reason: "Temporary compatibility seam while replacing legacy data source.",
}
```

The preferred outcome for this cycle is **zero new exceptions**.

## Documentation

Update:

```text
docs/architecture/layer-separation.md
```

after the refactor, not before, so the document reflects the executable rule set and final repository state.

The document should include:

- allowed dependency flow;
- each layer’s role;
- examples of valid imports;
- examples of not-allowed imports;
- exact exception list, if any;
- how to run the gate:

```bash
pnpm check:architecture
```

- how to add a justified exact exception;
- terminology note: use **finding**, **issue**, **not allowed**, or **boundary finding**, not **violation**.

## TDD / Regression Strategy

### Cycle 3.1 — Red: Lock the Current Boundary Baseline

Run:

```bash
node scripts/check-layer-boundaries.mjs
```

Confirm the 14 current findings are still reported before edits.

Add or update checker tests only if the current rule behaviour is not already covered.

### Cycle 3.2 — Green: Add the Package Script

Add `check:architecture`.

Verify:

```bash
pnpm check:architecture
```

still reports the same baseline findings before refactoring.

### Cycle 3.3 — Refactor Metadata Access

Refactor metadata consumers.

Run the narrowest affected suites, for example:

```bash
pnpm test:unit -- BaseLayout LessonMetaPanel
```

Adjust command names to the repository’s actual Vitest filters.

### Cycle 3.4 — Refactor Course Structure Access

Refactor navigation and course-tree consumers.

Run affected navigation/render suites.

Also run existing presentation adapter tests around navigation.

### Cycle 3.5 — Refactor Bibliography Access

Refactor `ReferencesFromCatalog`.

Run affected reference rendering tests.

### Cycle 3.6 — Refactor Simple UI Data Access

Refactor `NotFound` and `ToDo`.

Run their focused render/component tests.

### Cycle 3.7 — Architecture Gate

Run:

```bash
pnpm check:architecture
```

Expected result: no current boundary findings remain, except any explicitly justified exact exception.

### Cycle 3.8 — Final Focused Verification

Run the narrowest relevant Vitest suites touched by the refactor.

If the touched surface is broad enough, also run:

```bash
pnpm test:unit
```

## Acceptance Criteria

- `pnpm check:architecture` exists.
- `pnpm check:architecture` passes.
- Current `src/data/*` boundary findings are resolved or justified by exact exceptions.
- No wildcard allowlist entries are introduced.
- UI components no longer own direct access to raw data modules.
- Presentation adapters do not bypass accepted application or infrastructure boundaries.
- Affected render/component tests pass.
- Existing presentation adapter tests pass.
- `docs/architecture/layer-separation.md` reflects the final executable rule set.
- Public rendered behaviour remains unchanged.

## Risks and Mitigations

### Risk: Over-engineering trivial static data

Mitigation: use the smallest useful presentation-facing seam. Prefer props or narrow modules over generic repositories
when the data is simple and static.

### Risk: Moving imports without improving boundaries

Mitigation: classify each finding before refactoring. The new import path must represent a real ownership boundary, not
just a renamed data module.

### Risk: Brittle render tests after refactor

Mitigation: prefer structural assertions over raw HTML snapshots where possible.

### Risk: Checker and documentation drift

Mitigation: update architecture documentation only after the final checker result is known.

## Assumptions

- Cycle 3 must fix the current repository boundary findings.
- Static `src/data/*` imports in UI are boundary findings under the selected policy.
- Public site behaviour must remain unchanged.
- No changelog update is required.
