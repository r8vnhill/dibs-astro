# Third-Party Assets

## `@ravenhill/astro-icons`

The site consumes `@ravenhill/astro-icons` through the GitLab npm registry. The package brings together icon corpora
from multiple sources rather than representing a single upstream icon project.

### Phosphor Icons

The package's main icon corpus is **Phosphor Icons**.

- Original project: <https://phosphoricons.com/>
- Repository: <https://github.com/phosphor-icons/core>
- Copyright: Phosphor Icons
- License: MIT

The full license text used for this import is stored at:

- [`docs/licenses/phosphor-icons-MIT.txt`](./licenses/phosphor-icons-MIT.txt)

### Simple Icons

The `@ravenhill/astro-icons/brands` entry point is sourced from **Simple Icons**. Its SVG corpus is distributed under
the upstream project's CC0 terms; its trademark disclaimer still applies to the depicted marks.

- Project: <https://simpleicons.org/>

Most call sites import directly from `@ravenhill/astro-icons` (Phosphor icons) or `@ravenhill/astro-icons/brands`
(Simple Icons brand marks) instead of going through the `$icons` facade. `$icons` (`src/icons.ts`) still exists only to
serve five DIBS-specific language marks that have no upstream equivalent in `@ravenhill/astro-icons` yet: `Bash`, `Csv`,
`NushellLogo`, `Powershell`, and `Xml`. These remain local SVGs under `src/assets/icons/languages/` until (if ever) an
equivalent icon is published upstream.
