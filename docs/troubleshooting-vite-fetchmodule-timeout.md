# Troubleshooting `vite:invoke fetchModule` Timeouts

## TL;DR

If development fails with a `vite:invoke fetchModule` timeout involving
`/src/styles/global.css`, do not assume the stylesheet itself is broken.

First:

1. Stop the dev server.
2. Clear `.astro` and `node_modules/.vite`.
3. Restart with `pnpm dev`.
4. If the failure repeats on the same edit, capture verbose logs before changing CSS or Shiki-related code.

`DIBS_SHIKI_RUNTIME_PATCH_ENABLED` is not currently read by `config/shiki-warn-tracker.ts`. If it is set in a shell, unset
it as stale environment cleanup, not because it is an active runtime-patch switch in the current implementation.

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

## Why `global.css` appears in the error

The important detail is that the failing module path is often a **symptom**, not necessarily the root cause.

`/src/styles/global.css` sits very close to the root of the page graph:

- `BaseLayout.astro` imports it
- `NotesLayout.astro` and other page layouts import `BaseLayout.astro`
- many pages therefore trigger the same CSS fetch path during startup

That makes `global.css` a very visible place for transport failures to surface, even when the underlying stall was
caused elsewhere in the module graph.

## Evidence level

Repository-backed facts:

- `src/styles/global.css` no longer contains remote font imports and documents that remote font `@import` statements were
  moved out of CSS.
- `src/components/meta/Head.astro` loads Google Fonts via `<link rel="stylesheet">`.
- `config/shiki-warn-tracker.ts` currently suppresses noisy `[Shiki]` warnings only.
- `pnpm dev` and `pnpm preview` set `DIBS_SHIKI_RUNTIME_PATCH_ENABLED=false` for child processes, but no current config
  code reads that variable.
- `src/utils/dev-transport-retry.ts` retries some transport-bound operations, but Vite's own
  `fetchModule("/src/styles/global.css")` path is not wrapped by that helper.

Current inference:

- A timeout reported at `global.css` is likely a visible symptom of a broader Vite transport stall, not proof that the
  stylesheet content is the root cause.

## Most likely explanation

Based on the current repository evidence, the most likely explanation is:

- the Vite dev transport is stalling during a cold start or reload;
- the visible failure gets reported while fetching `/src/styles/global.css` because it is imported from the root layout
  and sits high in the module graph;
- the stall may be aggravated by other concurrent startup work, especially after changes to global imports,
  integrations, markdown processing, or Shiki-related code.

Without capturing a fresh verbose trace from the failing session, this remains a diagnostic interpretation rather than a
single proven root cause for every future timeout.

## Quick recovery

When the dev server is already stuck in this state, recover from a clean process and cache state.

### macOS/Linux

```sh
pkill -f "astro|wrangler" || true
rm -rf .astro node_modules/.vite
unset DIBS_SHIKI_RUNTIME_PATCH_ENABLED
pnpm dev
```

### PowerShell

```powershell
Get-Process node,wrangler -ErrorAction SilentlyContinue |
  Where-Object { $_.Path -like '*astro-website*' -or $_.ProcessName -eq 'wrangler' } |
  Stop-Process

Remove-Item -Recurse -Force .astro,node_modules/.vite -ErrorAction SilentlyContinue
Remove-Item Env:DIBS_SHIKI_RUNTIME_PATCH_ENABLED -ErrorAction SilentlyContinue
pnpm dev
```

If the server recovers after these steps, treat the incident as a transient Vite transport stall unless it starts
reproducing consistently on the same edit.

## Diagnostic decision tree

1. Did the server recover after clearing `.astro` and `node_modules/.vite`?
   - Yes: treat it as a transient dev transport stall.
   - No: continue.

2. Does `global.css` contain remote `@import url(...)` statements?
   - Yes: move remote font loading to `<head>` links.
   - No: continue.

3. Did the failure start after a dependency upgrade, new global import, integration change, markdown change, or
   Shiki-related change?
   - Yes: capture verbose logs and inspect startup-time imports around that change.
   - No: continue.

4. Does the failure reproduce on the same edit?
   - Yes: capture verbose logs and inspect concurrent startup imports.
   - No: avoid speculative refactors.

## Prevention checks

1. Confirm that `global.css` still contains only local imports.
   - It should import local files such as `./starwind.css`, `./theme/index.css`, `./utilities/index.css`, and
     `./components/index.css`.
   - It should not contain remote `@import url(...)` statements.

2. Treat the first failing module path as an entrypoint clue, not as definitive proof.
   - A timeout on `/src/styles/global.css` does not automatically mean the stylesheet content is the root cause.

3. If the issue persists, rerun the dev server with higher logging and capture the few seconds before the timeout.
   - The useful question is not only "which module failed", but also "what else was loading at the same time".

## What not to do

Avoid these changes unless a fresh trace justifies them:

- Do not randomly split or reorder `global.css`.
- Do not reintroduce remote CSS `@import url(...)` font loading into `global.css`.
- Do not assume `DIBS_SHIKI_RUNTIME_PATCH_ENABLED` is an active runtime-patch switch unless code is reintroduced to read
  it.
- Do not add retry logic around unrelated CSS imports without proving that the retry boundary owns the failing operation.

## When to investigate further

Open a follow-up issue if one of these happens:

- The timeout reproduces after cache cleanup.
- The timeout appears after a specific dependency upgrade.
- The timeout appears after adding a new global import, integration, markdown change, or Shiki-related change.
- The timeout repeats on the same edit.

Include:

- Node version.
- pnpm version.
- Astro version.
- Vite version.
- Operating system.
- The exact command used to start the dev server.
- Whether the command was `pnpm dev`, `pnpm preview`, an IDE task, or a direct Astro/Wrangler command.

## Practical mitigation

The current repository already uses the main mitigation justified by prior failures: keep remote font loading out of
`global.css`.

The normal repository entrypoints also set `DIBS_SHIKI_RUNTIME_PATCH_ENABLED=false` for their child process:

- `pnpm dev` runs `scripts/dev.mjs`, which starts Astro with that environment value.
- `pnpm preview` runs the local Astro/Wrangler proxy with the same development-time value.

No current config code reads that variable, so this should be understood as defensive compatibility with prior
troubleshooting work rather than an active runtime-patch toggle.

If the timeout still appears intermittently, the next step is not to move random CSS around. The next step is to capture
a fresh verbose trace and confirm whether another startup-time import is competing with Vite's transport.

## Maintenance note

`DIBS_SHIKI_RUNTIME_PATCH_ENABLED` is a server/config-time environment variable name from prior troubleshooting work. It
should not use a client-exposed prefix such as `PUBLIC_` or `VITE_`.

If more development-time feature flags are added, centralize their parsing in one config helper so values such as
`"true"`, `"false"`, unset, and invalid strings are handled consistently. If those flags become formal project
configuration, consider Astro's `astro:env` schema support for typed environment variables.

## Scope of this note

This note documents repository-backed findings and the most likely failure mechanism. It does **not** claim a single
proven root cause for every future `vite:invoke fetchModule` timeout, because those timeouts are transport-level symptoms
and can surface through different module paths.
