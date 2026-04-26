# dibs-astro: Design and Implementation of Software Libraries

[![Framework](https://img.shields.io/badge/framework-Astro-blue)](https://astro.build)
[![Build](https://img.shields.io/badge/build-pnpm-yellowgreen)](https://pnpm.io)
[![Platform](https://img.shields.io/badge/platform-Cloudflare%20Workers-orange)](https://workers.cloudflare.com)
[![License](https://img.shields.io/badge/license-BSD--2--Clause-blue.svg)](https://opensource.org/licenses/BSD-2-Clause)
[![Purpose](https://img.shields.io/badge/purpose-educational-yellow)](https://dibs.ravenhill.cl)
![Status](https://img.shields.io/badge/status-active-brightgreen)
[![DIBS Site](https://img.shields.io/badge/site-dibs.ravenhill.cl-purple)](https://dibs.ravenhill.cl)

This repository contains the public site for DIBS, a course on software library design and implementation.
The site is built with Astro, Tailwind CSS v4, and React islands, and it is deployed as a static site to Cloudflare
Workers Static Assets.

The course content itself is in Spanish. This README is in English to keep the repository reusable and easier to adapt
as a foundation for courses in other languages.

## Quick Start

```sh
pnpm install
pnpm dev
```

## Prerequisites

- Node.js `20` and pnpm `9` match the current GitLab CI configuration in `.gitlab-ci.yml`.
- Corepack is recommended so pnpm can be activated consistently.
- Cloudflare deployment requires Wrangler access to the configured Cloudflare account and route.

## Command Reference

| Command                              | Purpose                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------ |
| `pnpm dev`                           | Starts the local Astro development server after regenerating data.       |
| `pnpm build`                         | Regenerates data and builds the static production site into `dist/`.     |
| `pnpm preview`                       | Runs the local Astro/Wrangler preview proxy for the built site.          |
| `pnpm check`                         | Runs generated bibliography, Astro check, and lesson metadata dry-run.   |
| `pnpm test`                          | Runs both unit tests and Astro render tests.                             |
| `pnpm test:unit`                     | Runs the Vitest unit suite.                                              |
| `pnpm test:astro`                    | Runs Astro render/component tests with `vitest.astro.config.ts`.         |
| `pnpm fmt`                           | Formats the repository with dprint.                                      |
| `pnpm generate-icons`                | Regenerates the SVG export index under `src/assets/img/icons/`.          |
| `pnpm generate:bibliography-catalog` | Builds generated bibliography catalog artifacts.                         |
| `pnpm generate:lesson-metadata`      | Regenerates lesson metadata.                                             |
| `pnpm bibliography:report`           | Regenerates the bibliography catalog and prints the bibliography report. |
| `pnpm deploy`                        | Builds and deploys the site with Wrangler.                               |

## Course Content

DIBS content is written in Spanish and organized as structured course material.

- Lessons and course pages live under `src/pages/`.
- Shared course metadata, navigation structure, and generated lesson data live under `src/data/`.
- Bibliographic data and attribution live under `src/data/` and `docs/`.
- Slides, exercises, and supplementary resources are linked from the public site when available.

## Project Structure

- `src/pages/` contains the site pages, including the course notes.
- `src/layouts/` contains the shared page layouts.
- `src/components/` contains reusable UI, semantic, and navigation components.
- `src/assets/img/icons/` stores the local SVG icon set used by the project.
- `src/data/` contains structured content and course metadata.
- `docs/` contains repository documentation, architecture notes, and third-party attribution.

## Architecture Overview

The site separates course content, presentation layouts, reusable UI primitives, and structured metadata. Course pages
compose semantic components and shared layouts, while navigation, bibliography, generated metadata, and other structured
data stay under `src/data/`. This keeps lesson authoring mostly independent from lower-level rendering details and makes
future course iterations easier to extend.

For the current architecture boundary notes, see
[`docs/architecture/layer-separation.md`](./docs/architecture/layer-separation.md).

## Quality Gates

Before deployment or a larger pull request, run:

```sh
pnpm check
pnpm test
pnpm build
```

During focused development, prefer the narrowest relevant test command first, then run the full gate before release.

## Deployment

The project is generated as a static Astro build and deployed to Cloudflare Workers Static Assets.

- `pnpm build` creates the production output in `dist/`.
- `wrangler.toml` serves `./dist` through the `[assets]` configuration.
- `pnpm deploy` runs the release build and deploys with Wrangler.

## Troubleshooting

### `vite:invoke fetchModule` timeout while importing `src/styles/global.css`

If Astro/Vite reports an error like:

```text
Error: transport invoke timed out after 60000ms
... "name":"fetchModule" ... "/src/styles/global.css"
```

Recommended recovery:

```sh
rm -rf .astro node_modules/.vite
pnpm dev
```

For the broader repository-specific findings around this error, including PowerShell recovery commands and the
evidence-vs-inference boundary for this failure mode, see
[`docs/troubleshooting-vite-fetchmodule-timeout.md`](./docs/troubleshooting-vite-fetchmodule-timeout.md).

## Contributing

This repository is primarily maintained as the official DIBS course site. Contributions should preserve:

- Spanish course content.
- English repository-level documentation.
- Local-first assets where possible.
- Existing formatting, test, and attribution requirements.

For larger changes, open an issue first to discuss scope and expected impact. See
[`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) for the project conventions.

## Related Documentation

- [Vite fetchModule timeout troubleshooting](./docs/troubleshooting-vite-fetchmodule-timeout.md)
- [Layer separation architecture note](./docs/architecture/layer-separation.md)
- [Third-party assets](./docs/third-party-assets.md)
- [Contributing guide](./CONTRIBUTING.md)
- [Code of conduct](./CODE_OF_CONDUCT.md)
- [Phosphor Icons license](./docs/licenses/phosphor-icons-MIT.txt)

## License

This project is licensed under the **[BSD 2-Clause License](./LICENSE)**.

You may use, adapt, and share this code for personal, academic, or educational purposes as long as the
required attribution is preserved.

## Iconography and Credits

This site includes SVGs from **Phosphor Icons** in `src/assets/img/icons/`.

- Official site: <https://phosphoricons.com/>
- Repository: <https://github.com/phosphor-icons/core>
- License for those icons: MIT
- License text included in the repo: [`docs/licenses/phosphor-icons-MIT.txt`](./docs/licenses/phosphor-icons-MIT.txt)
- Attribution and integration notes: [`docs/third-party-assets.md`](./docs/third-party-assets.md)

## DIBS Course Site

The full DIBS course is available at:

👉 [https://dibs.ravenhill.cl](https://dibs.ravenhill.cl)

It includes complete lessons, slides, exercises, and supplementary resources in Spanish.
