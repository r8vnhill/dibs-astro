# @ravenhill/site-core

Reusable site and repository primitives for Ravenhill projects.

This package provides pure helpers for representing repository references, normalizing repository platforms, and
building repository or commit URLs.

It does not contain concrete website configuration, authors, course metadata, Astro integration, generated data, or
presentation components. Host applications own their site-specific values and pass those values into the helpers
exported from this package.

## Public API

Import from the package root only:

```ts
import {
    buildCommitUrl,
    buildRepoUrl,
    normalizePlatforms,
    type RepoRef,
} from "@ravenhill/site-core";
```

Subpath imports are intentionally unsupported so the package can change its internal layout without breaking
consumers.

## Repository Links

```ts
const ref: RepoRef = { user: "example", repo: "project" };

buildRepoUrl(ref, "gitlab");
// "https://gitlab.com/example/project"

buildCommitUrl(ref, "gitlab", "abc1234");
// "https://gitlab.com/example/project/-/commit/abc1234"
```

## Relationship With `@ravenhill/content-core`

`@ravenhill/content-core` owns lesson navigation and lesson metadata contracts.

`@ravenhill/site-core` owns generic site/repository primitives. It has no dependency on `content-core`, and
`content-core` should not depend on it unless a future design explicitly introduces a shared package boundary.
