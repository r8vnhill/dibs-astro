# [DONE] Cycle 4: Enforce UI-to-Presentation Boundaries

## Summary

Close the remaining small coupling gaps where UI code still imports domain or application internals directly. The goal
is to make UI surfaces depend on presentation-owned contracts only, then promote the current architecture policy from
“allowed but discouraged” to “enforced”.

**Status:** Implemented.

`pnpm check:architecture` currently passes. This cycle intentionally changes the policy so future UI imports from
`$domain/*` or `$application/*` become layer-boundary findings.

The cycle should preserve rendered behavior, public routes, component semantics, and existing user-facing output.

## Audit Result

After tightening `uiBoundaryRule`, the checker reported UI-to-domain/application findings in:

- `LessonMetaPanel.astro` and its render test;
- reference UI components and their shared reference-content helper.

Final result:

```bash
pnpm check:architecture
```

reports:

```txt
No layer boundary findings found.
```

No allowlist entries were added.

## Implementation Notes

- Metadata-panel formatting and commit-link shaping now live in `$presentation/adapters/lesson-metadata-panel`.
- Reference inline-field and slot-content resolution now flows through `$presentation/adapters/reference-content`.
- Manual navigation normalization now lives in `$presentation/adapters/navigation-normalization`.
- `src/utils/navigation.ts` remains only as a thin compatibility re-export.
- `uiBoundaryRule` now forbids UI imports from `domain`, `application`, and `infrastructure`.

## Architectural Intent

UI code should depend on:

- local UI components;
- presentation adapters/helpers/view models;
- assets and styles;
- stable utilities that are explicitly presentation-safe.

UI code should not depend directly on:

- `$domain/*`;
- `$application/*`;
- `$infrastructure/*`;
- `src/data/*`.

This keeps domain/application code independent from rendering concerns, makes UI components easier to test, and gives
presentation code a clear anti-corruption boundary for shaping view models.

## Key Changes

### 1. Move lesson metadata shaping to presentation ownership

Move metadata panel shaping out of `LessonMetaPanel.astro`.

Target design:

- `LessonMetaPanel.astro` renders a presentation view model.
- Date display formatting happens outside the component.
- Commit-link shaping happens outside the component.
- Domain/application DTOs do not leak into the Astro component.

Preferred target:

```text
src/presentation/adapters/lesson-metadata-panel.ts
```

or, if the logic is component-specific:

```text
src/components/notes/lesson-meta-panel-view-model.ts
```

Preserve the current `LessonMetaPanel` prop shape unless a narrow additive prop improves testability without leaking
internals.

### 2. Move reference inline-field resolution behind presentation helpers

Reference components should import only presentation-level helpers.

Target design:

- Components import from `src/components/ui/references/reference-content.ts` or a nearby presentation helper.
- `$domain/reference-content` remains used behind that presentation adapter.
- Slot precedence remains unchanged.
- Missing-title validation remains unchanged.
- Linked-label checks remain unchanged.
- Rendered HTML remains unchanged.

Avoid simply moving imports around if it creates another mixed abstraction. The helper should expose a
rendering-oriented contract, not raw domain operations.

### 3. Move navigation normalization into presentation ownership

Move manual navigation normalization out of `src/utils/navigation.ts`.

Preferred target:

```text
src/presentation/adapters/navigation-normalization.ts
```

Expected consumers:

- `NotesLayout.astro`
- layout/render tests
- presentation-level helper tests

Keep a compatibility re-export from `src/utils/navigation.ts` only if there are existing non-UI callers that still need
the old import path. If retained, document it as a compatibility wrapper and keep it thin.

### 4. Tighten `uiBoundaryRule`

Update the architecture checker policy:

- remove `domain` from UI allowed targets;
- remove `application` from UI allowed targets;
- add `domain` to UI forbidden targets;
- add `application` to UI forbidden targets;
- update checker suggestions to direct UI code toward presentation adapters/helpers/view models.

The checker message should make the intended dependency direction explicit:

```text
UI code must depend on presentation contracts, not domain/application internals.
Move shaping logic behind a presentation adapter or helper.
```

## TDD Cycles

### Cycle 4.1: Lock the new boundary rule

Start with checker tests.

Add or update cases for:

- UI importing `$domain/*`;
- UI importing `$application/*`;
- UI importing presentation adapters;
- UI importing stable utilities;
- presentation importing domain/application where appropriate;
- infrastructure/data imports from UI remaining forbidden.

Expected red:

- Current direct UI-to-domain/application imports should become findings after the rule change.

Implementation:

- update `uiBoundaryRule`;
- update checker messages/suggestions;
- verify the current repository now exposes the intended findings.

Focused commands:

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-rules.test.ts scripts/__tests__/layer-boundary-checker.test.ts
pnpm check:architecture
```

### Cycle 4.2: Extract metadata panel view model

Add focused tests before refactoring.

Cover:

- visible metadata display;
- missing/unknown dates;
- UTC-stable date formatting;
- commit hash/link rendering;
- absence of commit link when commit metadata is unavailable;
- no direct `$domain/*` or `$application/*` imports in `LessonMetaPanel.astro`.

Implementation:

- introduce a presentation view model/helper;
- move date formatting and commit-link shaping into presentation code;
- keep `LessonMetaPanel.astro` as a rendering component;
- update tests to assert rendered behavior, not internal implementation.

Focused command:

```bash
pnpm test:astro -- src/components/notes/__tests__/LessonMetaPanel.render.test.ts
```

### Cycle 4.3: Extract reference presentation helpers

Extend the reference-content tests first.

Cover:

- required title failures;
- inline field fallback;
- linked inline field resolution;
- linked-label validation;
- slot-over-prop precedence;
- blank fallback handling;
- unchanged rendered output in representative reference components.

Implementation:

- expose rendering-oriented helpers from `reference-content.ts` or a nearby presentation helper;
- keep domain helper imports behind that boundary;
- update reference components to consume the presentation helper only;
- avoid widening the public helper API beyond what components need.

Focused commands:

```bash
pnpm test:astro -- src/components/ui/references/__tests__
```

### Cycle 4.4: Move navigation normalization

Move tests with the code, unless a compatibility wrapper remains.

Cover:

- single previous/next links;
- multiple previous links;
- missing navigation sections;
- manual navigation normalization;
- layout rendering behavior;
- compatibility re-export behavior, if retained.

Implementation:

- create `src/presentation/adapters/navigation-normalization.ts`;
- update `NotesLayout.astro` to use the presentation-owned helper;
- move or duplicate tests as appropriate;
- shrink `src/utils/navigation.ts` to a compatibility wrapper or remove it.

Focused commands:

```bash
pnpm test:astro -- src/layouts/__tests__/NotesLayout.render.test.ts
```

Also run any moved helper unit tests.

### Cycle 4.5: Enforce and document the final policy

After all coupling findings are removed:

- rerun the architecture checker;
- update architecture documentation;
- add a Cycle 4 traceability note.

Documentation updates:

```text
docs/architecture/layer-separation.md
```

Must state that UI may import:

- presentation adapters/helpers/view models;
- local UI components;
- assets;
- styles;
- stable presentation-safe utilities.

Must state that UI must not import directly from:

- domain;
- application;
- infrastructure;
- data.

Traceability note should include:

- initial findings after tightening the rule;
- refactoring decisions;
- final checker result;
- final verification commands;
- any compatibility wrappers intentionally kept.

## Test Plan

### Focused checker suites

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-rules.test.ts scripts/__tests__/layer-boundary-checker.test.ts
```

### Focused behavior suites

```bash
pnpm test:astro -- src/components/notes/__tests__/LessonMetaPanel.render.test.ts
pnpm test:astro -- src/components/ui/references/__tests__
pnpm test:astro -- src/layouts/__tests__/NotesLayout.render.test.ts
```

Run relevant presentation/helper unit tests added during the cycle.

### Architecture verification

```bash
pnpm check:architecture
```

Expected result:

```text
0 findings
```

### Final verification

```bash
pnpm check
pnpm test:astro
pnpm test:unit
```

If the helper changes are narrow and already covered by focused suites, `pnpm test:unit` may be treated as final
regression coverage rather than an inner-loop command.

## Acceptance Criteria

- `LessonMetaPanel.astro` has no direct `$domain/*` or `$application/*` imports.
- Reference UI components have no direct `$domain/reference-content` imports.
- `NotesLayout.astro` imports navigation normalization from presentation-owned code.
- `src/utils/navigation.ts` is removed or reduced to a documented compatibility wrapper.
- `uiBoundaryRule` forbids UI imports from domain and application.
- Checker tests cover the new rule.
- `pnpm check:architecture` passes with zero findings.
- Rendered output is unchanged.
- No broad allowlist entries are added.
- No changelog update is required.

## Non-Goals

- Do not redesign the domain model.
- Do not change public rendered behavior.
- Do not introduce new runtime dependencies.
- Do not broaden presentation adapters into generic service locators.
- Do not add allowlist entries for the findings fixed in this cycle.
- Do not move infrastructure/data access into UI-adjacent files.

## Assumptions

- Current rendered behavior is correct and should be preserved.
- Presentation adapters may depend on domain/application contracts when they are acting as explicit boundaries.
- UI-to-utils imports are acceptable only for utilities that are stable, presentation-safe, and free from
  domain/application coupling.
- Any compatibility re-export should be temporary, documented, and thin.
