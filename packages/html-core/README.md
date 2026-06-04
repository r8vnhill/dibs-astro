# @ravenhill/html-core

Host-agnostic HTML semantic primitives for Ravenhill projects.

This package provides small, reusable TypeScript contracts for HTML semantics without depending on Astro, DOM APIs,
UI components, generated data, or site-specific configuration.

## Public API

Import from the package root only:

```ts
import type { HeadingLevel } from "@ravenhill/html-core";
```

Subpath imports are intentionally unsupported so the package can change its internal layout without breaking
consumers.

## Heading Levels

`HeadingLevel` represents the six standard HTML heading tag names:

```ts
type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
```

Use it when a component, adapter, or host-agnostic helper needs to accept a semantic heading level while keeping
invalid strings out of the type contract.

```ts
type SectionHeadingProps = {
    headingLevel?: Exclude<HeadingLevel, "h1">;
};
```

## Boundaries

This package should stay focused on reusable HTML semantic contracts. It should not contain:

- Astro components or framework-specific adapters;
- DOM or browser runtime behavior;
- generated site data;
- CSS, Tailwind classes, or visual presentation decisions;
- runtime validators unless a future migration explicitly expands the contract.

## Validation

From the `astro-website` workspace root:

```sh
pnpm --filter @ravenhill/html-core check
```
