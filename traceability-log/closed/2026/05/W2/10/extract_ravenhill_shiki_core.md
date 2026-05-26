## [DONE] Extract `@ravenhill/shiki-core`

### Summary

Extract the host-agnostic, non-UI Shiki infrastructure from `astro-website` into a new publishable workspace package,
`@ravenhill/shiki-core`.

The package will own syntax-highlighting orchestration, cache lifecycle, language alias resolution, fallback HTML
helpers, and reusable transformers. Astro components remain app-local because they are presentation/UI concerns. The
migration should preserve current runtime behavior, keep a temporary compatibility bridge, and validate the new package
as both a workspace dependency and an installed package.

This direction matches Shiki’s own design goals: it is ESM-first, portable across JavaScript runtimes, lazy-loads
themes/languages, and supports transformer-based customization. ([Shiki][1])

---

## Key Decisions

### 1. Create a dedicated package

Use a new package instead of extending `@ravenhill/content-core` or `@ravenhill/site-core`.

**Reason:** syntax highlighting is infrastructure for rendering code, not content metadata, navigation, site URL
construction, or presentation data access. Keeping it separate preserves package cohesion and avoids diluting existing
package charters.

### 2. Prefer dependency injection for retry behavior

Choose explicit retry-policy injection instead of copying `src/utils/dev-transport-retry.ts` into the package.

**Reason:** copying the app-local helper would preserve hidden coupling to app/dev-server assumptions. A small injected
retry wrapper keeps `@ravenhill/shiki-core` host-agnostic and easier to test.

Recommended shape:

```ts
export type RetryHighlightOperation = <T>(
    operation: () => Promise<T>,
    context: HighlightRetryContext,
) => Promise<T>;
```

The app can provide the current dev-transport retry implementation, while the package default can be a no-op retry
strategy.

### 3. Use root-only public exports

Expose only `@ravenhill/shiki-core`, not internal subpaths.

**Reason:** Node’s `exports` field is the modern way to define package entry points and prevent accidental imports from
internal modules. It also makes the public API easier to audit and safer for semver. ([Node.js][2])

### 4. Keep test hooks internal

Do not export cache-reset or warning-reset helpers from the public root.

**Reason:** test-only controls should be reachable through package-local tests, not consumer-facing API. The
installed-consumer check should prove that internal subpaths are blocked.

---

## Phase 0: Characterization Before Moving Code

**Goal:** lock current behavior before extraction.

### Tasks

1. Add or strengthen characterization tests around current `src/lib/shiki` behavior:

   - singleton highlighter reuse;
   - rejection reset after failed highlighter creation;
   - language alias normalization;
   - unknown-language fallback;
   - light/dark theme output shape;
   - transformer class output;
   - retry wrapper invocation only where currently expected.

2. Add app-level regression coverage for:

   - `LightCode.astro`;
   - `DarkCode.astro`;
   - `CodeLayout.astro`;
   - markdown patch integration via `config/patches/shiki`.

3. Capture the current expected public surface of `src/lib/shiki` barrels so the compatibility bridge can be tested
   later.

### Acceptance criteria

- Existing behavior is locked before any source movement.
- Tests fail meaningfully if cache semantics, alias resolution, fallback HTML, or transformer output changes.

---

## ~~Phase 1: Package Scaffold and Public Contract~~

**Goal:** create `packages/shiki-core` as a publishable, root-only TypeScript package.

### Tasks

1. Add `packages/shiki-core/package.json` aligned with existing workspace packages:

   - `name: "@ravenhill/shiki-core"`;
   - `type: "module"`;
   - root-only `exports`;
   - declaration output;
   - `files` restricted to distributable artifacts;
   - `publishConfig` for the GitLab Package Registry;
   - scripts for `build`, `typecheck`, `test`, `lint`, `pack:dry-run`, `consumer:check`, and `check`.

2. Add `tsup.config.ts` or package-local build config consistent with the existing package style. `tsup` is appropriate
   here because it is designed for bundling TypeScript libraries and is powered by `esbuild`. ([tsup][3])

3. Add `README.md` and package guidance documenting:

   - purpose;
   - public API;
   - non-goals;
   - host-agnostic retry strategy;
   - no Astro/UI components;
   - no direct internal imports;
   - migration notes for app consumers.

4. Define `src/index.ts` as the only public barrel.

### Proposed public API groups

```ts
// Cache and lifecycle
export { createShikiHighlighter, getShikiHighlighter };

// Highlighting options and contracts
export type {
    HighlightCodeOptions,
    HighlightLanguage,
    HighlightRetryContext,
    HighlightThemePair,
    RetryHighlightOperation,
};

// Language aliases
export { isKnownShikiAlias, normalizeShikiLanguage, resolveShikiLanguage };

// HTML fallback helpers
export { escapeCodeHtml, renderFallbackCodeHtml };

// Transformers
export { createLineTextColorTransformer, createTailwindClassTransformer };

// Constants
export { DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME };
```

### Acceptance criteria

- Package builds independently.
- Root import works.
- Internal subpath imports fail in the packaged-consumer test.
- Generated declarations expose only intentional API.

---

## ~~Phase 2: Extract Pure and Low-Risk Modules First~~

**Goal:** move deterministic helpers before stateful highlighter/cache logic.

### Move first

1. `language-aliases.ts`
2. `config.ts`
3. `html.ts`
4. `class-tokens.ts`
5. `line-text-color-helpers.ts`
6. transformer modules:

   - `tailwind-class-transformer.ts`;
   - `line-text-color-transformer.ts`;
   - `transformers.ts`.

### Tasks

1. Move modules into `packages/shiki-core/src`.
2. Remove app aliases such as `~/...`.
3. Convert imports to package-local relative imports.
4. Add package-level unit tests for each extracted unit.
5. Keep original app files temporarily as re-export wrappers where useful.

### Testing strategy

- Use BDD-style test names.
- Use DDT for language alias tables and fallback HTML escaping cases.
- Consider PBT for HTML escaping invariants:

  - escaped output should not contain raw `<`, `>`, or unescaped `&`;
  - escaping should be deterministic;
  - fallback rendering should preserve input text semantically.

### Acceptance criteria

- Extracted helpers are app-independent.
- Tests pass from inside `packages/shiki-core`.
- Existing app tests still pass through wrappers.

---

## ~~Phase 3: Extract Highlighter Orchestration and Cache Lifecycle~~

**Goal:** move the stateful Shiki orchestration without changing singleton semantics.

### Tasks

1. Move/adapt:

   - `cache.ts`;
   - `highlighter.ts`;
   - related types.

2. Preserve:

   - `globalThis` singleton behavior;
   - rejection-reset behavior;
   - theme/language loading behavior;
   - unknown-language fallback;
   - warning de-duplication behavior.

3. Add an injected retry strategy:

   - default: no-op retry;
   - app integration: uses existing dev-transport retry wrapper;
   - tests: use spies/fakes to validate retry call boundaries.

4. Keep internal test controls package-local:

   - reset highlighter cache;
   - reset warning state;
   - clear singleton state between tests.

5. Avoid exposing cache reset functions from the root public API.

### Shiki-specific notes

- Keep the package aligned with Shiki’s async model: Shiki shorthands load themes/languages on demand and cache in
  memory, while explicit highlighter construction gives finer control. ([Shiki][4])
- Keep transformer ordering explicit where the current output depends on it, because Shiki supports `pre`, normal, and
  `post` transformer ordering. ([Shiki][5])

### Acceptance criteria

- Package-level tests prove singleton reuse and failed-promise reset.
- Retry behavior is injectable and covered by tests.
- No app-local aliases remain in `packages/shiki-core`.

---

## ~~Phase 4: App Integration and Compatibility Bridge~~

**Goal:** migrate consumers while minimizing churn.

### Tasks

1. Add `@ravenhill/shiki-core` as a workspace dependency where needed.

2. Update app consumers that should use the package directly:

   - `LightCode.astro`;
   - `DarkCode.astro`;
   - `CodeLayout.astro`;
   - markdown patch files under `config/patches/shiki`.

3. Add compatibility wrappers under `src/lib/shiki`:

   - re-export from `@ravenhill/shiki-core`;
   - preserve old import paths for one release cycle;
   - mark wrappers as deprecated internally.

4. Keep Astro rendering responsibility in `src/components/ui/code`.

5. Inject app-specific retry behavior at the app boundary, not inside `shiki-core`.

### Acceptance criteria

- Existing app imports continue to work through the bridge.
- New imports can use `@ravenhill/shiki-core`.
- Astro components remain presentation-only.
- Markdown patch and component rendering paths share the same language/transformer behavior.

---

## ~~Phase 5: Package Consumer Validation~~

**Goal:** prove the package works outside the workspace.

### Tasks

1. Add `packages/shiki-core/scripts/validate-packed-consumer.mjs`.

2. The script should:

   - build the package;
   - pack it;
   - create a temporary external consumer project;
   - install the `.tgz`;
   - import from `@ravenhill/shiki-core`;
   - run a minimal ESM runtime check;
   - run TypeScript declaration checks;
   - assert that internal subpath imports fail.

3. Add package scripts:

   - `pack:dry-run`;
   - `consumer:check`;
   - `check`.

4. Wire package checks into root workflow:

   - `pnpm check`;
   - `prebuild`;
   - `predeploy`;
   - CI quality gate.

### Acceptance criteria

- The package is validated as an installed dependency, not only as a workspace-linked package.
- Root-only import policy is enforced.
- Declaration files are usable by a clean consumer.

---

## ~~Phase 6: Remove Duplicate Logic After One Compatibility Window~~

**Goal:** clean up app-local Shiki implementation after parity is proven.

### Tasks

1. Remove obsolete implementation files from `src/lib/shiki`.
2. Keep only compatibility wrappers if the release still needs them.
3. In the next cleanup cycle, remove wrappers and update all imports directly to `@ravenhill/shiki-core`.
4. Update architecture docs and agent guidance.

### Acceptance criteria

- There is one source of truth for Shiki infrastructure.
- App-local code owns only Astro/UI rendering.
- No duplicate cache, alias, fallback, or transformer logic remains.

---

## Relevant Files

### New package

- `packages/shiki-core/package.json`
- `packages/shiki-core/tsup.config.ts`
- `packages/shiki-core/src/index.ts`
- `packages/shiki-core/src/cache.ts`
- `packages/shiki-core/src/highlighter.ts`
- `packages/shiki-core/src/language-aliases.ts`
- `packages/shiki-core/src/config.ts`
- `packages/shiki-core/src/html.ts`
- `packages/shiki-core/src/transformers.ts`
- `packages/shiki-core/src/tailwind-class-transformer.ts`
- `packages/shiki-core/src/line-text-color-transformer.ts`
- `packages/shiki-core/src/class-tokens.ts`
- `packages/shiki-core/src/line-text-color-helpers.ts`

### App integration

- `src/lib/shiki/cache.ts`
- `src/lib/shiki/highlighter.ts`
- `src/lib/shiki/language-aliases.ts`
- `src/lib/shiki/config.ts`
- `src/lib/shiki/transformers.ts`
- `config/patches/shiki/createShikiHighlighter.ts`
- `config/patches/shiki/decorators.ts`
- `src/components/ui/code/LightCode.astro`
- `src/components/ui/code/DarkCode.astro`
- `src/components/ui/code/CodeLayout.astro`

### Workspace wiring

- `package.json`
- `pnpm-workspace.yaml`
- `.gitlab-ci.yml`, if package checks are explicitly listed
- package templates from:

  - `packages/content-core/package.json`
  - `packages/site-core/package.json`

---

## Verification

Run in this order:

1. Characterization tests before extraction:

```bash
pnpm test:unit -- src/lib/shiki
pnpm test:unit -- src/components/ui/code
```

2. New package checks:

```bash
pnpm --dir packages/shiki-core run build
pnpm --dir packages/shiki-core run test
pnpm --dir packages/shiki-core run check
```

3. Tarball/consumer contract:

```bash
pnpm --dir packages/shiki-core run pack:dry-run
pnpm --dir packages/shiki-core run consumer:check
```

4. App integration:

```bash
pnpm test:unit -- src/lib/shiki
pnpm test:unit -- src/components/ui/code
pnpm test:astro
```

5. Full workspace gate:

```bash
pnpm check
```

6. Manual smoke:

```bash
pnpm dev
```

Confirm:

- code blocks render in light and dark themes;
- unknown-language fallback still works;
- markdown-rendered code and Astro component-rendered code behave consistently;
- no duplicate warnings appear unexpectedly;
- no app route imports package internals.

---

## Risks and Mitigations

| Risk                                                   | Mitigation                                                           |
| ------------------------------------------------------ | -------------------------------------------------------------------- |
| Package accidentally depends on app aliases            | Add import-boundary tests and run packaged-consumer validation.      |
| Singleton behavior changes during extraction           | Characterize cache lifecycle before moving code.                     |
| Retry policy becomes app-coupled                       | Use injected retry strategy with no-op default.                      |
| Transformers render different HTML                     | Snapshot focused structural output, not excessive brittle full HTML. |
| Markdown patch path diverges from Astro component path | Route both through shared `shiki-core` helpers.                      |
| Public API grows too quickly                           | Root-only export and explicit package API review.                    |

---

## Suggested MR Title

**Extract host-agnostic Shiki infrastructure into `@ravenhill/shiki-core`**

[1]: https://shiki.style/guide/ "Introduction | Shiki"
[2]: https://nodejs.org/api/packages.html "Modules: Packages | Node.js v26.1.0 Documentation"
[3]: https://tsup.egoist.dev/?utm_source=chatgpt.com "tsup"
[4]: https://shiki.style/guide/shorthands "Shorthands | Shiki"
[5]: https://shiki.style/guide/transformers "Transformers | Shiki"
