# [PLAN] Tighten `site-data-adapter` Boundary

## Summary

Refine `site-data-adapter.ts` from a raw configuration re-export into a small query-oriented adapter.

The adapter should remain intentionally small, but it should stop exposing `WEBSITE_REPO_REFS` as a raw configuration
object across the infrastructure/presentation boundary. Presentation code should ask for site repository data through
functions, not depend directly on the concrete config constant.

Because this repository stores website repository references as a platform-keyed map, the collection accessor should
preserve that shape instead of converting it to `readonly RepoRef[]`.

## Decision

Replace direct `WEBSITE_REPO_REFS` re-exports with query functions:

```ts
getWebsiteRepoRef(platform: RepoPlatform): RepoRef | undefined

getWebsiteRepoRefs(): PartialRecord<RepoPlatform, RepoRef>
```

Keep `WEBSITE_PRIMARY_AUTHOR` exported for now because existing metadata/head consumers still use it directly. This can
be revisited later if author metadata grows beyond a simple constant.

## Goals

- Stop leaking raw site configuration through the presentation-facing adapter.
- Preserve current optional rendering behaviour for missing repository platforms.
- Keep the adapter simple and avoid premature factories or dependency injection.
- Preserve the current platform-keyed map representation.
- Make repository defaults easier to test through behaviour rather than constant identity.
- Leave reusable repository primitives in `@ravenhill/site-core`.

## Non-goals

- Do not add `requireWebsiteRepoRef()` yet.
- Do not add a factory-based adapter yet.
- Do not move DIBS-specific site config into `@ravenhill/site-core`.
- Do not change repository URL-building behaviour.
- Do not convert the repository map to an array.
- Do not introduce PBT for this adapter; this layer is too thin for it.

## Proposed API

### Infrastructure adapter

```ts
// src/infrastructure/adapters/site-data-adapter.ts

import type { RepoPlatform, RepoRef } from "@ravenhill/site-core";
import {
    getWebsiteRepoRef as getConfiguredWebsiteRepoRef,
    WEBSITE_PRIMARY_AUTHOR,
    WEBSITE_REPO_REFS,
} from "~/data/site";
import type { PartialRecord } from "~/utils/types";

export { WEBSITE_PRIMARY_AUTHOR };

export function getWebsiteRepoRef(platform: RepoPlatform): RepoRef | undefined {
    return getConfiguredWebsiteRepoRef(platform);
}

export function getWebsiteRepoRefs(): PartialRecord<RepoPlatform, RepoRef> {
    return { ...WEBSITE_REPO_REFS };
}
```

However, if `RepoRef` is not deeply readonly, prefer cloning the nested values too:

```ts
export function getWebsiteRepoRefs(): PartialRecord<RepoPlatform, RepoRef> {
    return Object.fromEntries(
        Object.entries(WEBSITE_REPO_REFS).map(([platform, repoRef]) => [
            platform,
            { ...repoRef },
        ]),
    ) as PartialRecord<RepoPlatform, RepoRef>;
}
```

This is safer because a shallow object copy protects the map object, but not the nested `RepoRef` values.

If `RepoRef` is already readonly, the simpler shallow copy is enough.

## Implementation Plan

### Phase 1 — Lock Current Behaviour

Before changing imports, add or update tests around the presentation adapter.

Cover the behaviour that must remain stable:

- configured GitLab repository references are returned;
- configured GitHub repository references are returned, if configured;
- unknown or unconfigured platforms return `undefined`;
- the collection accessor returns the platform-keyed map shape;
- callers do not receive the same object reference as the raw config.

This phase gives the refactor a safety net before removing the constant export.

### Phase 2 — Update Infrastructure Adapter

Update:

```txt
src/infrastructure/adapters/site-data-adapter.ts
```

Changes:

- stop re-exporting `WEBSITE_REPO_REFS`;
- keep exporting `WEBSITE_PRIMARY_AUTHOR`;
- keep `getWebsiteRepoRef(platform)`;
- add `getWebsiteRepoRefs()`;
- return a defensive copy from `getWebsiteRepoRefs()`.

Recommended behaviour:

```ts
export function getWebsiteRepoRefs(): PartialRecord<RepoPlatform, RepoRef> {
    return { ...WEBSITE_REPO_REFS };
}
```

Use nested cloning only if `RepoRef` is mutable or if tests reveal that consumers can mutate shared config through
returned values.

### Phase 3 — Update Presentation Adapter

Update:

```txt
src/presentation/adapters/site-data.ts
```

It should re-export the query-oriented API:

```ts
export {
    getWebsiteRepoRef,
    getWebsiteRepoRefs,
    WEBSITE_PRIMARY_AUTHOR,
} from "~/infrastructure/adapters/site-data-adapter";
```

It should no longer re-export `WEBSITE_REPO_REFS`.

This keeps presentation code dependent on the presentation adapter, not directly on infrastructure or raw data modules.

### Phase 4 — Update Presentation Consumers

Update presentation code that currently imports `WEBSITE_REPO_REFS`.

Likely affected areas:

```txt
lesson-metadata-panel
LessonMetaPanel.astro
```

Replace raw constant usage with:

```ts
import { getWebsiteRepoRefs } from "$presentation/adapters/site-data";

const repoRefs = getWebsiteRepoRefs();
```

If the component only needs one platform, prefer the narrower query:

```ts
import { getWebsiteRepoRef } from "$presentation/adapters/site-data";

const repoRef = getWebsiteRepoRef("gitlab");
```

Prefer the single-platform accessor where possible. It keeps call sites more explicit and avoids handing a whole
collection to code that only needs one value.

### Phase 5 — Update Site Config Documentation and Examples

Keep:

```txt
src/data/site.ts
```

as the concrete configuration source.

Update comments/examples so app-level consumers are directed toward:

```ts
$presentation / adapters / site - data;
```

instead of importing directly from:

```ts
~/data/site;
```

The config module can still export raw constants internally, but it should not be the preferred import path for
presentation code.

### Phase 6 — Add Boundary Guardrails

Add one or more lightweight guardrails:

- update architecture boundary tests if they already classify presentation adapter imports;
- add a unit test ensuring `WEBSITE_REPO_REFS` is not exported from `$presentation/adapters/site-data`;
- optionally add a targeted import-boundary rule preventing presentation components from importing `~/data/site`.

The strongest rule is:

> Presentation components may import site metadata only from `$presentation/adapters/site-data`.

This keeps the architecture boundary enforceable instead of relying only on convention.

## Test Plan

### New tests

Add:

```txt
src/presentation/adapters/__tests__/site-data.test.ts
```

Suggested BDD-style cases:

```ts
describe("site data presentation adapter", () => {
    it("returns the configured GitLab repository reference", () => {
        // ...
    });

    it("returns the configured GitHub repository reference when available", () => {
        // ...
    });

    it("exposes repository references as a platform-keyed map", () => {
        // ...
    });

    it("returns a defensive copy of the repository reference map", () => {
        // ...
    });

    it("does not expose the raw repository reference constant", async () => {
        // ...
    });
});
```

For DDT, use `it.each` for configured platforms:

```ts
it.each(
    [
        ["gitlab"],
        ["github"],
    ] satisfies RepoPlatform[][],
)("returns the configured %s repository reference", (platform) => {
    expect(getWebsiteRepoRef(platform)).toEqual(getWebsiteRepoRefs()[platform]);
});
```

Only include platforms that are actually configured, or derive the cases from `getWebsiteRepoRefs()` to avoid brittle
tests.

### Existing tests to update

Update any tests importing:

```ts
WEBSITE_REPO_REFS;
```

from the presentation adapter.

They should now use:

```ts
getWebsiteRepoRefs();
```

or, preferably:

```ts
getWebsiteRepoRef(platform);
```

### Commands

Run targeted checks first:

```sh
pnpm exec vitest run src/presentation/adapters/__tests__/site-data.test.ts
```

Then run affected render tests:

```sh
pnpm exec vitest run path/to/LessonMetaPanel.test.ts
```

Then run broader checks:

```sh
node scripts/run-astro-check.mjs
pnpm check
```

## Acceptance Criteria

- `WEBSITE_REPO_REFS` is no longer exported from `site-data-adapter.ts`.
- `WEBSITE_REPO_REFS` is no longer exported from `$presentation/adapters/site-data`.
- Presentation consumers use `getWebsiteRepoRef()` or `getWebsiteRepoRefs()`.
- `getWebsiteRepoRefs()` returns a platform-keyed map.
- `getWebsiteRepoRefs()` does not return the same object reference as the raw config.
- Missing platform config remains represented as `undefined`.
- `WEBSITE_PRIMARY_AUTHOR` remains exported for current consumers.
- `@ravenhill/site-core` is unchanged.
- Existing metadata panel behaviour is preserved.
- `pnpm check` passes.

## Risks and Mitigations

| Risk                                                 | Mitigation                                                                    |
| ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| Callers still mutate nested `RepoRef` values         | Clone nested `RepoRef` objects or make `RepoRef` readonly                     |
| Presentation code keeps importing from `~/data/site` | Add architecture guardrails or import-boundary tests                          |
| Adapter becomes an unnecessary abstraction           | Keep only query functions; defer factories                                    |
| Tests become too coupled to concrete site values     | Test structural behaviour and derive configured platform cases where possible |
| `getWebsiteRepoRefs()` encourages broad access       | Prefer `getWebsiteRepoRef(platform)` in consumers that need only one platform |

## Suggested Commit Breakdown

1. **Add adapter behaviour tests**

   - Lock current repository lookup and collection behaviour.

2. **Replace raw repo-ref export**

   - Add `getWebsiteRepoRefs()`.
   - Stop exporting `WEBSITE_REPO_REFS`.

3. **Update presentation adapter and consumers**

   - Replace constant imports with query functions.

4. **Update metadata panel tests**

   - Ensure rendering behaviour remains unchanged.

5. **Add or update boundary guardrails**

   - Prevent direct presentation imports from raw site config.

6. **Update local docs/examples**

   - Point consumers to `$presentation/adapters/site-data`.

## Final Recommendation

This is a good-sized refactor. I would keep it intentionally narrow:

- add `getWebsiteRepoRefs()`;
- remove the raw `WEBSITE_REPO_REFS` re-export;
- keep `WEBSITE_PRIMARY_AUTHOR` for now;
- avoid factories;
- avoid `requireWebsiteRepoRef()`;
- add BDD/DDT tests at the presentation adapter boundary;
- reserve PBT for `@ravenhill/site-core`, where repository URL and normalisation logic has real algebraic behaviour
  worth testing.
