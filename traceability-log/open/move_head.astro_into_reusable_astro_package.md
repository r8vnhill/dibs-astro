# [PLAN] Move `Head.astro` Into Reusable Astro Package

## Scope Decision

This is a **medium-scope migration**, so the plan is organized into **phases**. Each phase is suitable for later
decomposition into short TDD cycles.

The migration should remain **behavior-preserving** for the DIBS site. The intended production change is architectural:
move reusable head rendering and metadata normalization into `@ravenhill/astro-head` while keeping DIBS-specific
defaults in the DIBS application.

## Phase 1 — Characterize Current Head Behavior [DONE]

### Goal

Lock down the current observable behavior before moving files or changing imports.

### Scope

- Capture current `Head.astro` rendering behavior.
- Capture current `buildHeadPageMeta` behavior.
- Identify which values are reusable metadata concerns and which values are DIBS host configuration.
- Use Kaleido Star-inspired fixture data where fake metadata is needed, without embedding any DIBS defaults.

Example fixture values:

- `siteName: "Kaleido Stage"`
- `title: "Sora Naegino Audition Notes"`
- `description: "Training notes for a new stage performer."`
- `defaultSocialImage: "/images/layla-hamilton-social-card.png"`

### Red

Add or tighten characterization tests with BDD-style descriptions:

- `Head renders explicit title, description, canonical URL, favicon links, sitemap link, social metadata, and configured font links`
- `Head falls back to host-provided defaults when page metadata omits optional values`
- `buildHeadPageMeta normalizes partial page metadata without reading app globals`
- `buildHeadPageMeta preserves existing title/description/url/social-image behavior`

Use DDT for input matrices:

| Case                         | Page title | Page description | Page URL | Social image | Expected source |
| ---------------------------- | ---------: | ---------------: | -------: | -----------: | --------------- |
| Fully explicit page metadata |        yes |              yes |      yes |          yes | page            |
| Missing title                |         no |              yes |      yes |          yes | host default    |
| Missing description          |        yes |               no |      yes |          yes | host default    |
| Missing social image         |        yes |              yes |      yes |           no | host default    |
| Minimal metadata             |         no |               no |       no |           no | host defaults   |

### Green

Make only minimal test adjustments needed to describe current behavior accurately.

### Refactor

Do not refactor production code yet. Rename tests only if doing so improves intent.

### Acceptance Criteria

- Current metadata behavior is covered before extraction.
- Tests make the app/package boundary visible.
- No package has been created yet.
- No production behavior has changed.

### Non-goals

- Do not introduce the new package yet.
- Do not rename public metadata types yet.
- Do not change generated metadata output.

### Suggested Execution Order

1. Inspect current `Head.astro` and `src/utils/page-meta.ts`.
2. Add missing characterization coverage.
3. Run the narrow current test suite.
4. Commit the behavior lock before extraction.

---

## Phase 2 — Create the `@ravenhill/astro-head` Package Shell

### Goal

Add the reusable package boundary without moving behavior yet.

### Scope

- Add `packages/astro-head`.
- Add package manifest, TypeScript config, Astro-aware check setup, and test setup consistent with the workspace.
- Define the intended public export surface.
- Keep the package empty or minimally stubbed until tests drive the migration.

### Red

Add package-contract tests or static checks that initially fail:

- `package exports TypeScript helpers from the root entry point`
- `package exports Head.astro only from the explicit component subpath`
- `package does not expose internal source paths`
- `package does not depend on DIBS app aliases or generated data`

Expected public imports:

```ts
import { buildHeadPageMeta, type PageMeta } from "@ravenhill/astro-head";
import Head from "@ravenhill/astro-head/Head.astro";
```

### Green

Create the smallest package shell that satisfies workspace discovery and package-contract checks.

Suggested export shape:

```json
{
    "name": "@ravenhill/astro-head",
    "type": "module",
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "import": "./dist/index.js"
        },
        "./Head.astro": "./src/Head.astro"
    }
}
```

Adjust paths to match the repository’s existing Astro package conventions.

### Refactor

- Align package scripts with neighboring workspace packages.
- Avoid custom build logic unless the repository already requires it.
- Keep config names consistent with the monorepo.

### Acceptance Criteria

- The workspace detects `@ravenhill/astro-head`.
- Root imports are reserved for TypeScript helpers.
- `Head.astro` is available only through the explicit component export path.
- The package has no dependency on the DIBS app, generated data, content packages, or `~/` aliases.

### Non-goals

- Do not migrate `Head.astro` yet.
- Do not migrate `page-meta.ts` yet.
- Do not update `BaseLayout.astro` yet.

### Suggested Execution Order

1. Add package folder and manifest.
2. Add check/test scripts.
3. Add package-boundary checks.
4. Run `pnpm --filter @ravenhill/astro-head check`.

---

## Phase 3 — Move Pure Metadata Normalization

### Goal

Move host-agnostic metadata logic into the new package first, before moving the Astro component.

### Scope

- Move reusable logic from `src/utils/page-meta.ts` to `packages/astro-head/src`.
- Export:

  - `buildHeadPageMeta`
  - `PageMeta`
  - related public metadata/config types
- Keep DIBS-specific values out of the package.
- Decide whether `src/utils/page-meta.ts` remains as a temporary compatibility re-export.

### Red

Move or duplicate the metadata tests into the package and make them fail against the new import path:

- `buildHeadPageMeta builds complete metadata from partial page metadata and explicit host defaults`
- `buildHeadPageMeta does not import site constants`
- `buildHeadPageMeta accepts URL/path inputs without assuming the DIBS domain`
- `buildHeadPageMeta preserves existing DIBS output when given current DIBS config`

Use DDT for normalization cases:

| Input kind                 | Example                     | Expected behavior                                         |
| -------------------------- | --------------------------- | --------------------------------------------------------- |
| Absolute URL               | `https://example.test/sora` | preserved or normalized as current behavior requires      |
| Root-relative path         | `/episodes/layla`           | resolved against `defaultUrl` if current behavior does so |
| Missing social image       | omitted                     | fallback to `defaultSocialImage`                          |
| Missing page title         | omitted                     | fallback to `defaultTitle`                                |
| Empty optional font config | `[]`                        | render no optional links                                  |

### Green

Move the implementation with the fewest behavior changes.

Potential package types:

```ts
export interface HeadHostConfig {
    siteName: string;
    defaultTitle: string;
    defaultDescription: string;
    defaultUrl: string;
    defaultSocialImage: string;
}

export interface PageMeta {
    title?: string;
    description?: string;
    url?: string;
    image?: string;
}
```

Only use names that match the existing project’s terminology.

### Refactor

- Split pure helpers into small functions if the extraction reveals mixed responsibilities.
- Keep functions short and independently testable.
- Avoid adding dependencies unless they replace fragile URL/path logic with a well-maintained standard utility already
  used in the workspace.

### Acceptance Criteria

- Package metadata tests pass.
- DIBS metadata tests still pass through direct imports or compatibility re-exports.
- The package does not import `site`, `~/utils`, generated data, Astro content collections, or app-only modules.
- Public types are exported from the package root.

### Non-goals

- Do not move `Head.astro` in this phase.
- Do not change DIBS metadata defaults.
- Do not broaden metadata semantics beyond current behavior.

### Suggested Execution Order

1. Move types and pure functions.
2. Port tests to package imports.
3. Add temporary compatibility re-export if direct migration is not trivial.
4. Run package tests and the current app metadata tests.

---

## Phase 4 — Move and Parameterize `Head.astro`

### Goal

Move the Astro component into the package and make all host-specific values explicit props/config.

### Scope

- Move `Head.astro` to `packages/astro-head/src/Head.astro`.
- Remove imports of DIBS `site` constants.
- Replace `include404Font` with generic font-link configuration.
- Keep rendering behavior equivalent when DIBS passes the same values from `site.HEAD`.

Recommended component API:

```ts
interface Props {
    pageMeta?: PageMeta;
    siteName: string;
    defaultTitle: string;
    defaultDescription: string;
    defaultUrl: string;
    faviconIcoPath: string;
    faviconPngPath: string;
    sitemapPath: string;
    defaultSocialImage: string;
    fontLinks?: readonly HeadFontLink[];
    extraFontLinks?: readonly HeadFontLink[];
    includeExtraFontLinks?: boolean;
}
```

Prefer a single config object if the existing component call sites are already prop-heavy:

```ts
interface Props {
    pageMeta?: PageMeta;
    config: HeadConfig;
}
```

The config-object form is preferable if it reduces prop churn in `BaseLayout.astro`.

### Red

Move/port component render tests into the package:

- `Head renders metadata from explicit host config`
- `Head renders default metadata when page metadata is partial`
- `Head renders configured favicon and sitemap links`
- `Head renders base font links`
- `Head renders extra font links only when enabled`
- `Head does not render DIBS-specific values unless provided by the host`

Use DDT for font behavior:

| `fontLinks` | `extraFontLinks` | `includeExtraFontLinks` | Expected links           |
| ----------- | ---------------- | ----------------------: | ------------------------ |
| provided    | omitted          |                   false | base only                |
| provided    | provided         |                   false | base only                |
| provided    | provided         |                    true | base + extra             |
| omitted     | provided         |                    true | extra only, if supported |
| omitted     | omitted          |                    true | none                     |

### Green

Move the component and pass config explicitly.

### Refactor

- Extract repeated link rendering into small helpers only if Astro syntax remains readable.
- Keep the component mostly declarative.
- Do not introduce a generic SEO framework abstraction unless existing tests expose duplicated behavior that justifies
  it.

### Acceptance Criteria

- Package component tests pass.
- `Head.astro` does not import DIBS app modules.
- The component can be consumed through `@ravenhill/astro-head/Head.astro`.
- Font behavior is generic and not named after 404 behavior.
- Existing rendered metadata remains equivalent when passed the current DIBS config.

### Non-goals

- Do not redesign the site’s SEO strategy.
- Do not add new metadata tags unless already rendered today.
- Do not move fonts, favicons, or social images into the package.

### Suggested Execution Order

1. Move `Head.astro`.
2. Replace app imports with explicit props/config.
3. Port render tests to the package.
4. Add DDT font-link coverage.
5. Run `pnpm --filter @ravenhill/astro-head check`.

---

## Phase 5 — Wire DIBS Through `BaseLayout.astro`

### Goal

Make the DIBS app consume the reusable package while preserving the same rendered output.

### Scope

- Update `BaseLayout.astro` to import:

  - `Head` from `@ravenhill/astro-head/Head.astro`
  - `PageMeta` from `@ravenhill/astro-head`
- Pass DIBS-specific configuration from `site.HEAD`.
- Keep `@ravenhill/site-core` unchanged.

### Red

Add an app-level integration render test:

- `BaseLayout passes DIBS head configuration to the reusable Head component`
- `BaseLayout renders the same title, description, canonical URL, social image, favicon, sitemap, and font links as before`
- `BaseLayout keeps page-level metadata overrides working`

This test should compare the rendered output against the current expected metadata values, not against implementation
details.

### Green

Update `BaseLayout.astro` and any direct imports.

Migration strategy:

1. Prefer direct import updates if there are only a few call sites.
2. Use a temporary compatibility re-export from `src/utils/page-meta.ts` only if direct migration creates unnecessary
   churn.
3. Remove compatibility only after all app imports are migrated.

### Refactor

- Consolidate DIBS head config construction near `BaseLayout.astro` or the existing `site.HEAD` definition.
- Avoid spreading unrelated `site` config into the reusable component.
- Prefer explicit mapping from DIBS config to `HeadConfig`.

### Acceptance Criteria

- DIBS app render tests pass.
- No DIBS-specific values live in `@ravenhill/astro-head`.
- `@ravenhill/site-core` remains unchanged.
- `BaseLayout.astro` is the app boundary that supplies host configuration.
- Existing pages render the same head metadata as before.

### Non-goals

- Do not change the `site.HEAD` schema unless necessary to remove component coupling.
- Do not migrate unrelated layout behavior.
- Do not introduce a new global config loader.

### Suggested Execution Order

1. Add failing app integration test.
2. Update imports in `BaseLayout.astro`.
3. Pass explicit DIBS config.
4. Run the targeted app render test.
5. Update remaining imports or add compatibility re-export.

---

## Phase 6 — Clean Compatibility and Enforce Boundaries

### Goal

Remove migration scaffolding and prevent regressions across the new package boundary.

### Scope

- Remove `src/utils/page-meta.ts` compatibility re-export if no longer needed.
- Add or update architecture checks to prevent package imports from DIBS app internals.
- Update package docs or README with public import examples.
- Run final validation.

### Red

Add boundary tests/checks if the repository has architecture-test infrastructure:

- `@ravenhill/astro-head does not import from src/`
- `@ravenhill/astro-head does not import generated data`
- `@ravenhill/astro-head does not use ~/ aliases`
- `DIBS app imports Head only through @ravenhill/astro-head/Head.astro`

### Green

Remove compatibility files and fix imports.

### Refactor

- Simplify public type names only if tests and call sites remain clearer.
- Keep deprecated compatibility exports only if other packages still depend on them and removal would exceed this
  migration’s scope.

### Acceptance Criteria

- `pnpm --filter @ravenhill/astro-head check` passes.
- Targeted package tests pass.
- Targeted DIBS render tests pass.
- `pnpm check` passes after app wiring is complete.
- No app-only imports exist inside the reusable package.
- Public imports match the package contract.

### Non-goals

- Do not publish the package externally in this phase.
- Do not migrate unrelated metadata utilities.
- Do not add new visual assets or site defaults.

### Suggested Execution Order

1. Add/adjust boundary checks.
2. Remove compatibility re-export if safe.
3. Update docs/import examples.
4. Run targeted checks.
5. Run full `pnpm check`.

---

## Final Validation Commands

Run narrow checks first, then broaden:

```powershell
pnpm --filter @ravenhill/astro-head check
pnpm --filter @ravenhill/astro-head test
pnpm test:astro -- src/components/meta/__tests__/Head.render.test.ts
pnpm check
```

Adjust command names to the repository’s existing scripts.

## Overall Acceptance Criteria

- `@ravenhill/astro-head` exists as a workspace package.
- Root package imports expose TypeScript helpers only.
- `Head.astro` is imported through `@ravenhill/astro-head/Head.astro`.
- `buildHeadPageMeta`, `PageMeta`, and related public metadata types are exported from the package root.
- The package is Astro-specific but host-independent.
- The package does not contain DIBS defaults, URLs, favicons, social images, fonts, generated data imports, app aliases,
  or concrete site constants.
- `BaseLayout.astro` passes DIBS-specific config from `site.HEAD`.
- Existing DIBS rendered metadata remains behaviorally equivalent.
- `@ravenhill/site-core` remains unchanged.
- Compatibility re-exports are either removed or explicitly documented as temporary.

## Deferred Items

- External npm publication.
- Public package documentation beyond minimal import examples.
- Broader SEO/tag redesign.
- Changes to DIBS site metadata values.
- Moving unrelated layout, font, or asset concerns into reusable packages.
- Creating a generic non-Astro `html-core` package unless a real package boundary appears in the repository.
