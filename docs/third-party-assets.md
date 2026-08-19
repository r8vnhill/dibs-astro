# Third-Party Assets

## Phosphor Icons

The site consumes the audited **Phosphor Icons** package through the GitLab npm registry as
`@ravenhill/astro-icons`.

- Original project: <https://phosphoricons.com/>
- Repository: <https://github.com/phosphor-icons/core>
- Copyright: Phosphor Icons
- License: MIT

The full license text used for this import is stored at:

- [`docs/licenses/phosphor-icons-MIT.txt`](./licenses/phosphor-icons-MIT.txt)

Most call sites import directly from `@ravenhill/astro-icons` (Phosphor icons) or
`@ravenhill/astro-icons/brands` (brand/language logos) instead of going through the `$icons` facade.
`$icons` (`src/icons.ts`) still exists only to serve five DIBS-specific language marks that have no
upstream equivalent in `@ravenhill/astro-icons` yet: `Bash`, `Csv`, `NushellLogo`, `Powershell`, and
`Xml`. These remain local SVGs under `src/assets/icons/languages/` until (if ever) an equivalent icon
is published upstream.
