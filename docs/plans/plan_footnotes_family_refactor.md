# Footnotes Family Refactor Plan

## Summary

Refactor the footnotes family away from the current implicit module-level counter and toward an explicit per-page registry model that auto-numbers refs/notes, fails fast on mismatches, and keeps the existing API available as legacy. Migrate all current callers to the new preferred API in the same change, while preserving the current visual design unless a small accessibility fix requires a class or markup adjustment.

## Implementation Changes

- Introduce a new public helper, `createFootnoteRegistry()`, plus an opaque `FootnotesRegistry` type in the footnotes module.
- Make the new preferred API:
  - page frontmatter creates one registry: `const footnotes = createFootnoteRegistry()`
  - inline refs use `<FootnoteRef registry={footnotes} />`
  - the notes block uses `<Footnotes registry={footnotes}>` and child `<Footnote>`
- Keep legacy props (`index`, `refId`) working for compatibility, but treat them as legacy mode. Do not allow mixing legacy manual-index mode and registry mode within the same footnotes group; throw a build-time error with a clear message if mixed.
- Replace the shared `counter.ts` global state with registry-owned state:
  - ref sequence counter
  - note sequence counter
  - generated IDs for `fn-*`, `fnref-*`, and the section label
  - final validation that ref count equals note count
- Generate scoped IDs so the design can support multiple groups later without collisions:
  - `footnotes-{scope}-label`
  - `fn-{scope}-{n}`
  - `fnref-{scope}-{n}`
  - for this iteration, migrate pages with a single default registry each; do not add multi-group authoring sugar yet
- Keep authoring style close to current usage:
  - refs and notes remain separate components
  - numbering becomes automatic via the shared registry
  - remove manual `index={...}` from migrated callers
- Harden accessibility and markup:
  - remove the hardcoded `fn-label` ID
  - keep `aria-labelledby`, back-reference labels, and list semantics
  - keep the current visual styling unless a unique scoped selector is needed for safety
- Update exports so consumers can import the registry helper from the existing footnotes barrel.
- Migrate every current footnotes caller to the new API in the same change by:
  - creating one registry in frontmatter
  - passing `registry={footnotes}` to all `FootnoteRef`, `Footnotes`, and `Footnote` usages
  - removing manual indices and manual ref wiring where they only existed to compensate for the old counter behavior
- Mark the old manual-index path as legacy in code comments and any nearby docs/examples, but keep it functional.

## Public API / Types

- Add `createFootnoteRegistry(): FootnotesRegistry`.
- Add `registry?: FootnotesRegistry` to `FootnoteRef`, `Footnote`, and `Footnotes`.
- Preserve `index?: number` and `refId?: string` only for the legacy path.
- Registry mode contract:
  - `registry` is the single source of truth for numbering and generated IDs
  - refs and notes are paired by order of registration
  - mismatched counts or mixed modes throw during render/build

## Test Plan

- Add Astro render tests for the footnotes family covering:
  - auto-numbered single-group happy path
  - correct `href`/`id` pairing between ref and note
  - unique `aria-labelledby`/section IDs
  - back-reference rendering and accessible label
  - legacy manual-index mode still rendering correctly
  - mixed legacy + registry mode failing with a clear error
  - ref count greater than note count failing
  - note count greater than ref count failing
- Use DDT for mismatch/error matrices and mixed-mode scenarios.
- If the registry helper is implemented as a pure TS utility, add unit tests for ordering and ID generation invariants. PBT is optional here; only use it if the helper becomes sufficiently pure and generic to justify invariant-based testing.

## Assumptions

- No new dependency is needed; implement with local TS utilities and Astro components only.
- Current pages use one footnotes block each, so caller migration targets the single-registry case now.
- The new API becomes the preferred path immediately, and existing callers are migrated in the same refactor.
- Multi-group pages are not a primary v1 requirement, but the ID and registry design must not block them later.
- Mismatch handling defaults to fail-fast during build/render, not warnings.
