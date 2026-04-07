# Troubleshooting `vite:invoke fetchModule` Timeouts

## Symptom

During local development, Astro/Vite may fail with an error like:

```text
transport invoke timed out after 60000ms
... "name":"fetchModule" ... "/src/styles/global.css"
```

In this repository, the stack commonly points at:

- [`src/layouts/BaseLayout.astro`](../src/layouts/BaseLayout.astro), which imports
  [`src/styles/global.css`](../src/styles/global.css)
- the Vite module runner trying to fetch that CSS module during a cold start or reload

## What is actually failing

The important detail is that the failing module path is often a **symptom**, not necessarily the
root cause.

`/src/styles/global.css` sits very close to the root of the page graph:

- `BaseLayout.astro` imports it
- `NotesLayout.astro` and other page layouts import `BaseLayout.astro`
- many pages therefore trigger the same CSS fetch path during startup

That makes `global.css` a very visible place for transport failures to surface, even when the
underlying stall was caused elsewhere in the module graph.

## Repo findings

These findings come directly from the current repository state:

1. **Remote font imports are no longer in `global.css`.**
   - `src/styles/global.css` explicitly documents that remote font `@import` statements were moved
     out of CSS.
   - `src/components/meta/Head.astro` now loads Google Fonts via `<link rel="stylesheet">`.
   - This means the older, known “remote CSS import inside `global.css`” failure mode has already
     been mitigated in the current codebase.

2. **There is a second known trigger related to Astro's internal markdown/Shiki runtime patch.**
   - `astro.config.ts` documents that `config/shiki-warn-tracker.ts` keeps an Astro markdown-Shiki
     runtime patch enabled for builds, but intentionally disables it in local development.
   - `config/shiki-warn-tracker.ts` states the reason explicitly: the dynamic import of Astro's
     internal markdown/Shiki runtime can compete with Vite transport and trigger
     `vite:invoke fetchModule` timeouts during cold starts.

3. **This patch can be re-enabled accidentally through an environment variable.**
   - `config/shiki-warn-tracker.ts` checks `DIBS_SHIKI_RUNTIME_PATCH_ENABLED`.
   - If that variable is set to `true` during local development, the repo will opt back into the
     exact behavior that was documented as risky for dev-time transport stability.

4. **The repository already contains retry logic for some dev transport failures, but not for this CSS fetch path.**
   - `src/utils/dev-transport-retry.ts` retries certain transport-bound operations.
   - That helper is used by Shiki-related code paths.
   - The failing `fetchModule("/src/styles/global.css")` request itself is still handled by Vite's
     own module runner, so this retry helper does not directly protect that import.

## Most likely explanation

Based on the current repository evidence, the most likely explanation is:

- the Vite dev transport is stalling during a cold start or reload;
- the visible failure gets reported while fetching `/src/styles/global.css` because it is imported
  from the root layout and sits high in the module graph;
- the stall may be aggravated by other concurrent startup work, especially Astro/Shiki-related
  dynamic imports if the markdown runtime patch is enabled in development.

This is stronger than a guess because the repository already documents the Shiki runtime patch as a
known source of `vite:invoke fetchModule` stalls. However, without capturing a fresh verbose trace
from the failing session, it is still an inference that the current incident followed that exact
path.

## Checks to perform when the error happens again

1. Confirm that `global.css` still contains only local imports.
   - It should import local files such as `./starwind.css`, `./theme/index.css`,
     `./utilities/index.css`, and `./components/index.css`.
   - It should not contain remote `@import url(...)` statements.

2. Check whether `DIBS_SHIKI_RUNTIME_PATCH_ENABLED` is set in your shell.
   - In PowerShell:

   ```powershell
   echo $env:DIBS_SHIKI_RUNTIME_PATCH_ENABLED
   ```

   - If it prints `true`, unset it and restart the dev server:

   ```powershell
   Remove-Item Env:DIBS_SHIKI_RUNTIME_PATCH_ENABLED
   ```

3. Treat the first failing module path as an entrypoint clue, not as definitive proof.
   - A timeout on `/src/styles/global.css` does not automatically mean the stylesheet content is
     the root cause.

4. If the issue persists, rerun the dev server with higher logging and capture the few seconds
   before the timeout.
   - The useful question is not only “which module failed”, but also “what else was loading at the
     same time”.

## Practical mitigation

The current repository already uses the two main mitigations that were justified by prior failures:

- keep remote font loading out of `global.css`;
- keep Astro's markdown/Shiki runtime patch disabled in local development by default.

If the timeout still appears intermittently, the next step is not to move random CSS around. The
next step is to capture a fresh verbose trace and confirm whether another startup-time dynamic
import is competing with Vite's transport in the same way.

## Scope of this note

This note documents repository-backed findings and the most likely failure mechanism. It does
**not** claim a single proven root cause for every future `vite:invoke fetchModule` timeout,
because those timeouts are transport-level symptoms and can surface through different module paths.
