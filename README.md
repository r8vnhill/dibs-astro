# dibs-astro: Design and Implementation of Software Libraries

[![Framework](https://img.shields.io/badge/framework-Astro-blue)](https://astro.build)
[![Build](https://img.shields.io/badge/build-pnpm-yellowgreen)](https://pnpm.io)
[![Platform](https://img.shields.io/badge/platform-Cloudflare%20Workers-orange)](https://workers.cloudflare.com)
[![License](https://img.shields.io/badge/license-BSD--2--Clause-blue.svg)](https://opensource.org/licenses/BSD-2-Clause)
[![Purpose](https://img.shields.io/badge/purpose-educational-yellow)](https://dibs.ravenhill.cl)
[![Status](https://img.shields.io/badge/status-stable-brightgreen)]()
[![DIBS Site](https://img.shields.io/badge/site-dibs.ravenhill.cl-purple)](https://dibs.ravenhill.cl)

This repository contains the public site for DIBS, a course on software library design and implementation.
The site is built with Astro, Tailwind CSS v4, Markdoc, and React islands, and it is deployed as a static site
for Cloudflare Workers.

The course content itself is in Spanish. This README is in English to keep the repository reusable and easier to adapt
as a foundation for courses in other languages.

## Getting Started

1. Install dependencies with `pnpm install`.
2. Start the local development server with `pnpm dev`.
3. Build the production site with `pnpm build`.
4. Preview the built site locally with `pnpm preview`.
5. Run the test suite with `pnpm test`.

Useful commands:

- `pnpm generate-icons` regenerates the SVG export index under `src/assets/img/icons/`.
- `pnpm check` runs the static checks used by the project.
- `pnpm deploy` runs the full pipeline for release.

## Project Structure

- `src/pages/` contains the site pages, including the course notes.
- `src/layouts/` contains the shared page layouts.
- `src/components/` contains reusable UI, semantic, and navigation components.
- `src/assets/img/icons/` stores the local SVG icon set used by the project.
- `src/data/` contains structured content and course metadata.
- `docs/` contains repository documentation, architecture notes, and third-party attribution.

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
