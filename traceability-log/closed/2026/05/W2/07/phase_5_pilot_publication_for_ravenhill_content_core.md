# [DONE] Phase 5 — Pilot Publication for `@ravenhill/content-core`

## Summary

The first controlled GitLab Package Registry release path for `@ravenhill/content-core` is now documented and wired
for manual use as `0.1.0`.

This phase keeps the release process **manual and maintainer-driven**. The goal is to validate that the package can be
consumed as a real registry dependency before adding release automation, versioning workflows, or public
documentation guarantees.

The package is published through the GitLab project npm endpoint and installed by consumers through the GitLab group
npm endpoint, matching GitLab’s documented npm registry model. ([GitLab Documentation][1])

Known GitLab IDs:

- Project: `r8vnhill/dibs-astro-website`
- Project ID: `71752456`
- Namespace/group-style owner: `r8vnhill`
- Group ID: `110542663`

## Goals

- Publish `@ravenhill/content-core@0.1.0` to GitLab Package Registry.
- Verify that the published package behaves like the Phase 4 packed-consumer tarball.
- Document the minimum manual release workflow for maintainers.
- Keep the package’s public API root-only.
- Keep release automation explicitly out of scope.

## Non-Goals

- No Changesets.
- No semantic-release.
- No automatic GitLab CI publish job.
- No public npmjs.com publication.
- No additional exported subpaths.
- No new package names or scope migration.
- No generated changelog workflow beyond the manual pilot notes.

## Key Changes

### 1. Update `packages/content-core/package.json`

Set the first publishable version:

```json
{
    "name": "@ravenhill/content-core",
    "version": "0.1.0",
    "private": false,
    "publishConfig": {
        "@ravenhill:registry": "https://gitlab.com/api/v4/projects/71752456/packages/npm/",
        "access": "restricted"
    }
}
```

Notes:

- `private` must be absent or `false`; npm refuses to publish packages with `"private": true`. ([npm Docs][2])
- Prefer GitLab’s documented scoped publish config form, `@scope:registry`, so the publish target is explicit for this
  package scope. ([GitLab Documentation][1])
- `access: "restricted"` is acceptable as npm publish-time intent, but GitLab package visibility is still controlled by
  GitLab project/group permissions, not npmjs.com access semantics.

### 2. Add committed non-secret registry mapping

Add or update a committed `.npmrc` only if the repository should make install resolution obvious for local consumers:

```ini
@ravenhill:registry=https://gitlab.com/api/v4/groups/110542663/-/packages/npm/
```

Do **not** commit tokens.

Token configuration must remain local, CI-injected, or environment-variable based. GitLab explicitly warns against
hardcoding package registry tokens in `.npmrc` or other committed files. ([GitLab Documentation][1])

For local publishing, document this as an uncommitted command:

```bash
npm config set -- //gitlab.com/api/v4/projects/71752456/packages/npm/:_authToken="${NPM_TOKEN}"
```

For local installation from the group endpoint, document this separately:

```bash
npm config set -- //gitlab.com/api/v4/groups/110542663/-/packages/npm/:_authToken="${NPM_TOKEN}"
```

If the package tarball URL resolves through the project endpoint during group installation, also document the
project-token mapping as a troubleshooting step:

```bash
npm config set -- //gitlab.com/api/v4/projects/71752456/packages/npm/:_authToken="${NPM_TOKEN}"
```

This matters because GitLab documents cases where group-level package metadata can point tarball downloads back to
project endpoints, requiring authentication for both paths in some clients. ([GitLab Documentation][1])

### 3. Add a manual preflight checklist

Before publishing, run:

```bash
pnpm install
pnpm check:content-core
pnpm check
pnpm --dir packages/content-core run consumer:check
pnpm --dir packages/content-core pack --dry-run --json
```

Also verify package metadata before publish:

```bash
pnpm --dir packages/content-core exec npm pkg get name version private publishConfig exports files types main
```

Expected properties:

- `name` is `@ravenhill/content-core`.
- `version` is `0.1.0`.
- `private` is absent or `false`.
- `publishConfig["@ravenhill:registry"]` points to the project endpoint.
- `exports` exposes only the root entry point.
- No source-only, test-only, or workspace-only files appear in the dry-run pack output.

### 4. Add duplicate-version preflight

Before publishing, check whether `0.1.0` already exists:

```bash
npm view @ravenhill/content-core@0.1.0 version \
  --registry=https://gitlab.com/api/v4/groups/110542663/-/packages/npm/
```

Expected result before the first pilot publish:

- The command should fail with a not-found-style result, or return no existing `0.1.0`.

If it returns `0.1.0`, stop the release. Do **not** republish the same version.

GitLab documents duplicate package/version and namespace collisions as possible causes of publish/install failures, so
this should be an explicit maintainer gate. ([GitLab Documentation][1])

### 5. Publish manually from the package directory

Authenticate outside committed files:

```bash
export NPM_TOKEN="<token-with-package-publish-permission>"
npm config set -- //gitlab.com/api/v4/projects/71752456/packages/npm/:_authToken="${NPM_TOKEN}"
```

Then publish:

```bash
pnpm --dir packages/content-core publish --no-git-checks
```

Optional, if the client requires or preserves npm access metadata:

```bash
pnpm --dir packages/content-core publish --access restricted --no-git-checks
```

Prefer avoiding `--no-git-checks` only if the repository state is guaranteed clean and pnpm’s workspace publish checks
do not block the pilot. If used, compensate with the explicit preflight checks above.

### 6. Verify package appears in GitLab

After publish, verify through GitLab UI:

- Project → Deploy → Package Registry.
- Package name: `@ravenhill/content-core`.
- Version: `0.1.0`.

Also verify from CLI:

```bash
npm view @ravenhill/content-core@0.1.0 \
  --registry=https://gitlab.com/api/v4/groups/110542663/-/packages/npm/
```

### 7. Add registry-backed external consumer smoke test

Create a temporary project outside the pnpm workspace:

```bash
tmpdir="$(mktemp -d)"
cd "$tmpdir"

cat > package.json <<'JSON'
{
  "private": true,
  "type": "module",
  "devDependencies": {
    "typescript": "^5.9.0"
  }
}
JSON

cat > .npmrc <<'NPMRC'
@ravenhill:registry=https://gitlab.com/api/v4/groups/110542663/-/packages/npm/
NPMRC

npm config set -- //gitlab.com/api/v4/groups/110542663/-/packages/npm/:_authToken="${NPM_TOKEN}"
npm config set -- //gitlab.com/api/v4/projects/71752456/packages/npm/:_authToken="${NPM_TOKEN}"

npm install @ravenhill/content-core@0.1.0
```

Add a runtime import check:

```bash
cat > smoke.mjs <<'JS'
import * as contentCore from "@ravenhill/content-core";

console.log(Object.keys(contentCore).sort());
JS

node smoke.mjs
```

Add a TypeScript declaration check:

```bash
cat > tsconfig.json <<'JSON'
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "strict": true,
    "skipLibCheck": false
  },
  "include": ["smoke.ts"]
}
JSON

cat > smoke.ts <<'TS'
import * as contentCore from "@ravenhill/content-core";

const exportedNames: string[] = Object.keys(contentCore);
console.log(exportedNames);
TS

npx tsc --noEmit
```

Add a blocked-subpath check:

```bash
cat > blocked-subpath.mjs <<'JS'
import("@ravenhill/content-core/navigation")
  .then(() => {
    console.error("Unexpected subpath import success");
    process.exit(1);
  })
  .catch(() => {
    console.log("Blocked subpath import as expected");
  });
JS

node blocked-subpath.mjs
```

## Documentation Updates

Update `packages/content-core/README.md` from Phase 4 tarball-consumer wording to pilot-release wording.

Include:

- Package purpose.
- Current stability status: **pilot internal package**.
- Installation from GitLab Package Registry.
- Required scoped registry mapping.
- Root-only import policy.
- Minimal import example.
- Manual publish checklist.
- Troubleshooting section for:

  - missing auth token;
  - wrong registry endpoint;
  - duplicate version;
  - tarball download 404 after group metadata resolution;
  - accidental subpath import attempts.

Example consumer documentation:

````md
## Installation

Configure the `@ravenhill` scope to use the GitLab group package registry:

```ini
@ravenhill:registry=https://gitlab.com/api/v4/groups/110542663/-/packages/npm/
```

Then install the package:

```bash
npm install @ravenhill/content-core@0.1.0
```

## Usage

Import from the package root only:

```ts
import { LessonSequenceService } from "@ravenhill/content-core";
```

Subpath imports are intentionally unsupported:

```ts
// Unsupported:
import { LessonSequenceService } from "@ravenhill/content-core/navigation";
```
````

## Test Plan

Mandatory local checks:

```bash
pnpm check:content-core
pnpm check
pnpm --dir packages/content-core run consumer:check
pnpm --dir packages/content-core pack --dry-run --json
```

Mandatory registry-backed checks after publish:

```bash
npm view @ravenhill/content-core@0.1.0 \
  --registry=https://gitlab.com/api/v4/groups/110542663/-/packages/npm/
```

Then run the external consumer smoke test for:

- runtime ESM import;
- TypeScript declaration resolution with `NodeNext`;
- root-only import contract;
- blocked subpath imports;
- package metadata visibility from the group endpoint.

## Failure Handling

### If preflight fails

Do not publish. Fix the package locally and rerun all checks.

### If publish fails because the version already exists

Do not delete and republish as part of this phase. Choose one of:

- keep `0.1.0` as the pilot and document the result;
- increment to `0.1.1` in a follow-up phase;
- deprecate the broken version if it was already published and should not be used.

### If registry install fails

Check, in order:

1. The group registry mapping for `@ravenhill`.
2. The group endpoint auth token.
3. The project endpoint auth token.
4. Whether GitLab package registry is enabled for the project.
5. Whether the package/version exists.
6. Whether the client is resolving to the expected endpoint.

GitLab documents `403`, `404`, token, endpoint, and duplicate package/version issues as common npm registry
troubleshooting cases. ([GitLab Documentation][1])

## Acceptance Criteria

Phase 5 is complete when:

- `@ravenhill/content-core@0.1.0` is published to GitLab Package Registry.
- The package can be installed from the group registry endpoint.
- Runtime imports from `@ravenhill/content-core` work in an external consumer.
- TypeScript declarations resolve under `moduleResolution: "NodeNext"`.
- Subpath imports remain unavailable.
- README documents registry setup, root-only imports, and manual publishing.
- No auth tokens are committed.
- No release automation is added.

## Implementation Status

Completed in this workspace:

- `packages/content-core/package.json` now declares `0.1.0`, `private: false`, and the scoped GitLab project publish
  endpoint.
- `/.npmrc` now commits the `@ravenhill` group registry mapping for local installs.
- `packages/content-core/README.md` now documents the pilot release status, installation, root-only usage, manual
  publish workflow, and troubleshooting notes.
- `packages/content-core/AGENTS.md` now reflects the pilot publication path.
- `pnpm --dir astro-website/packages/content-core run check` passed, including the external packaged-consumer smoke
  test.

## Assumptions

- `@ravenhill/content-core` remains the final pilot package name.
- `0.1.0` is the first intended published version.
- Publication remains manual in Phase 5.
- GitLab group registry is the preferred consumer install endpoint.
- GitLab project registry is the preferred publish endpoint.
- Any future automation, provenance, release notes, or multi-package versioning belongs to a later phase.

[1]: https://docs.gitlab.com/user/packages/npm_registry/ "npm packages in the package registry | GitLab Docs"
[2]: https://docs.npmjs.com/cli/v10/configuring-npm/package-json "package.json | npm Docs"
