# Cycle 8: Integration Lock-In and Architecture Alignment

## Summary

This cycle should turn the Phase 2 refactor from a set of locally correct moves into a repository-level contract. The goal is to prove that the new boundaries hold under real presentation flows, that the UI still exhibits the same observable behaviour after the domain and adapter extractions, and that the architecture documentation describes the current system rather than an earlier transitional state.

This is an integration-hardening cycle, not a redesign cycle. It should extend the existing high-value boundary suites rather than introduce a parallel integration harness. The primary lock points remain:

* `src/layouts/__tests__/NotesLayout.render.test.ts`
* `src/presentation/adapters/__tests__/navigation-bridge.test.ts`
* `src/presentation/adapters/__tests__/lesson-metadata-bridge.test.ts`
* reference render suites under `src/components/ui/references/__tests__` 

## Goals

* Prove that `NotesLayout` still resolves navigation and, where applicable, metadata through the real presentation adapters.
* Prove that the reference UI still renders the same user-visible output after domain extraction.
* Prove that presentation adapters expose only UI-safe contracts and do not leak domain or infrastructure details.
* Bring the architecture notes up to date so the effective boundaries are explicit and discoverable.

## Non-Goals

This cycle should not:

* redesign metadata generation or the generated dataset format;
* change course-structure authoring;
* introduce new dependency-injection infrastructure;
* widen the public adapter contracts;
* add broad new test harnesses when existing suites can express the behaviour cleanly.

## Workstreams

### 1. Lock navigation at the presentation boundary

Strengthen `NotesLayout.render.test.ts` so it validates the final presentation flow rather than isolated helper behaviour.

Required coverage:

* one real-route case that exercises automatic navigation through the existing bridge-driven path;
* assertions for both `previous` and `next` where the selected route makes that possible;
* one manual-override case proving that explicit `previous` and `next` values still take precedence over automatic resolution;
* no assertions that depend on domain-only or infrastructure-only shapes.

Breadcrumbs or trail rendering should only be included if `NotesLayout` currently renders them as part of this flow. If that responsibility lives elsewhere, document that explicitly and keep this cycle focused on previous/next navigation.

**Success condition:** `NotesLayout` is proven to consume navigation through the presentation boundary, and its observable navigation behaviour remains unchanged.

### 2. Lock reference rendering after domain extraction

Keep pure rule coverage in `src/domain/__tests__/reference-content.test.ts`. Do not re-test domain normalization logic indirectly across every render suite.

Render-layer coverage should stay narrow and contract-focused. Update the smallest useful set of reference component suites so they prove that the UI still behaves the same after the domain move.

Required coverage:

* meaningful slot content overrides prop content;
* empty slot content falls back to prop content correctly;
* linked metadata and plain-text metadata still render distinctly and correctly;
* missing-title failures still surface through the UI-facing error path.

If `src/components/ui/references/__tests__/reference-content.test.ts` still duplicates domain concerns, narrow it so it covers only Astro-facing responsibilities:

* slot input/output behaviour;
* batching or slot-preparation behaviour that is specific to the UI adapter;
* translation of domain failures into UI-observable failures.

**Success condition:** reference render suites validate UI contracts only, while domain suites remain the single source of truth for pure rules.

### 3. Lock metadata lookup at the adapter boundary

Strengthen `lesson-metadata-bridge.test.ts` so it validates the presentation contract, not just lookup success or failure.

Required coverage:

* known route returns only serializable, UI-safe fields;
* unknown route returns `undefined`;
* normalized path inputs behave the same as canonical inputs, but only if that remains part of the public bridge contract.

Do not duplicate infrastructure responsibilities here. Dataset loading, validation, and caching should remain covered in infrastructure-facing tests such as `LessonMetadataAdapter.test.ts` or the relevant `utils/lesson-metadata` tests.

At least one render-level assertion should prove that `NotesLayout`, or whichever UI consumer is authoritative here, consumes the bridge result without depending on infrastructure-only fields such as `sourceFile`.

**Success condition:** the metadata bridge is locked as a DTO-only presentation adapter, and at least one UI path proves that the consumer respects that boundary.

### 4. Refresh architecture documentation

Update `docs/architecture/layer-separation.md` so it becomes the primary current-state architecture note.

Add a concise “Phase 2 status” section that records the effective boundaries now present in code:

* `src/domain` owns lesson-navigation rules, reference-content rules, and lesson-metadata normalization or formatting rules;
* `src/application` orchestrates through repository and service contracts;
* `src/infrastructure/adapters` owns `courseStructure` mapping and generated metadata dataset access;
* `src/presentation/adapters` acts as the composition boundary for `NotesLayout`-style consumers.

Also document the intentional exceptions and clarifications:

* `src/utils/lesson-metadata.ts` still exists as infrastructure support for JSON loading, zod validation, and caching;
* `src/components/ui/references/reference-content.ts` should now be described as an Astro or UI adapter, not a business-rules module;
* older Phase 0 or Phase 1 notes that still describe Domain as a stub, or `NotesLayout` integration as pending, should be updated or explicitly marked stale.

**Success condition:** a reader can open `layer-separation.md` and understand the current boundaries without reconstructing them from historical notes.

## Boundary Contracts to Preserve

These contracts should remain unchanged in this cycle unless an existing test cannot express the intended boundary cleanly:

* `resolveAutoNav(pathname, lessons)` returns presentation-safe navigation data only: `{ previous?, next? }`, where each link is `{ title, href }`.
* `resolveLessonMetadata(pathname)` returns serializable `LessonMetadataDto`-shaped data only.
* reference UI components continue to rely on domain helpers for pure rules and keep Astro slot handling and error translation local to the UI layer.

## Test Plan

### `src/layouts/__tests__/NotesLayout.render.test.ts`

Add or strengthen coverage for:

* a real route with automatic navigation;
* manual override precedence;
* breadcrumb or trail assertions only if the layout currently renders them;
* metadata-driven assertions only if the layout directly consumes lesson metadata.

### `src/presentation/adapters/__tests__/navigation-bridge.test.ts`

Preserve and tighten:

* first, middle, last, and not-found behaviour;
* stable public shape;
* absence of leaked domain-only fields.

### `src/presentation/adapters/__tests__/lesson-metadata-bridge.test.ts`

Preserve and tighten:

* known and unknown route behaviour;
* DTO-only, serializable output;
* route normalization behaviour, if that is still part of the public contract.

### Reference render suites

Touch only the minimum number of suites needed to lock the UI contract. Prefer the existing suite that already gives the best leverage for slot precedence and metadata rendering, such as `ScholarlyArticle`, `GenericReference`, or the nearest equivalent in the current tree.

## Verification

Run the full verification pass after the targeted test updates:

```text
pnpm test:unit
pnpm test:astro
pnpm exec tsc --noEmit
pnpm run check
```

## Completion Criteria

This cycle is done when all of the following are true:

* `NotesLayout` integration is proven through the real presentation path.
* navigation and metadata bridges are locked to UI-safe contracts.
* reference render suites validate UI behaviour without re-owning domain logic.
* `layer-separation.md` accurately documents the current architecture.
* all verification commands pass without requiring new production abstractions.

## Defaults and Decision Rules

* Prefer extending existing suites over creating new ones.
* Prefer one high-signal integration assertion over several overlapping low-signal cases.
* If breadcrumbs are not currently rendered by `NotesLayout`, document that and do not invent breadcrumb work.
* If an assertion would require reaching through a presentation adapter into domain or infrastructure details, the assertion is probably testing the wrong layer.

## Outcome

Cycle 8 was implemented by extending the existing boundary suites rather than introducing a parallel integration harness.

Completed lock points:

* `src/layouts/__tests__/NotesLayout.render.test.ts`
  * now covers a real-route case with both auto `previous` and `next`
  * now proves manual `previous` and `next` override the auto path
  * now asserts lesson metadata reaches the layout through the presentation bridge without leaking infrastructure-only fields

* `src/presentation/adapters/__tests__/lesson-metadata-bridge.test.ts`
  * now locks canonical, raw-path, and full-URL inputs to the same DTO result
  * now asserts the bridge exposes only presentation-safe metadata fields

* `src/components/ui/references/__tests__/reference-content.test.ts`
  * remains focused on Astro slot classification, slot preparation, and UI-facing title failure mapping
  * no longer duplicates an extra direct assertion against lower-level domain text-classification helpers

Documentation alignment completed:

* `docs/architecture/layer-separation.md` remains the authoritative current-state architecture note.
* `traceability-log/phase_2_isolate_domain_across_navigation_references_and_metadata_via_short_tdd_cycles.md` now records Cycle 8 as complete and summarizes the locked boundaries.
* Breadcrumb rendering was explicitly left out of the lock because `NotesLayout` currently renders previous/next navigation only.
