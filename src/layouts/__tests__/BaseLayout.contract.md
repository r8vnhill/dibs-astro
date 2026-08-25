# BaseLayout characterization contract

Audience: site maintainers and contributors who need to change or reuse the root layout safely.

These tests describe behavior visible at the DIBS root-layout boundary. They intentionally avoid source structure,
generated whitespace, exact class ordering, inline-script text, and private helper calls.

## Observable behavior

- `BaseLayout.render.test.ts` covers the document skeleton, content projection, semantic ordering, skip link, language
  precedence, page metadata, repository links, and localized theme controls.
- `BaseLayout.export-contract.render.test.ts` covers the DOM differences between web and PDF lesson rendering.
- `tests/e2e/base-layout-contract.spec.ts` covers keyboard navigation, early theme initialization, and main-content
  spacing in a real browser.

## Ownership map

The following classification keeps the current contract explicit while the shell is evaluated for reuse:

- Shell boundary: document root, main landmark, projected content, ordering, and skip-link target.
- DIBS policy or adapter: language fallback, PDF robots metadata, chrome visibility, and content spacing.
- DIBS integration: title, description, canonical URL, structured metadata, repository destinations, and theme labels.
- Policy with a shell seam: theme resolution and initialization before `DOMContentLoaded`.

The ownership map is provisional. A second consumer must confirm the reusable boundary before it is published as a
package contract.
