# Phase 6: Removed the Deprecated Shiki Compatibility Bridge

**Status:** ✅ COMPLETED on 2026-05-10

## Summary

The deprecated `src/lib/shiki/*` compatibility bridge has been successfully removed after one compatibility window, leaving `@ravenhill/shiki-core` as the single source of truth for reusable, host-agnostic Shiki infrastructure and `~/lib/code-highlighting` as the only Astro app-local highlighting boundary.

This phase was a cleanup and boundary-hardening phase that deleted obsolete wrapper code, removed compatibility-only tests, and updated repository guidance.

## Goals Accomplished

✅ **Deleted** `src/lib/shiki/**` and all compatibility-only tests  
✅ **Verified** no active consumer code imported from the deprecated bridge  
✅ **Created** Phase 6 import boundary test in `tests/architecture/shiki-import-boundary.test.ts`  
✅ **Preserved** the three-part architectural split:
  - `@ravenhill/shiki-core` for reusable package APIs
  - `~/lib/code-highlighting` for app-specific highlighting service
  - `src/components/ui/code` for UI rendering only  
✅ **Enforced** root-only package consumption (no `@ravenhill/shiki-core/*` subpath imports)  
✅ **Updated** this traceability log and repository guidance

## What Was Done

### Step 1: Pre-Deletion Import Analysis
- Scanned entire codebase for imports from `~/lib/shiki`, `src/lib/shiki`, and `@ravenhill/shiki-core/*`
- **Finding:** No active consumer code imported from the deprecated bridge
- Only the compatibility tests in `src/lib/shiki/__tests__/` imported from the bridge (by design)
- This confirmed Phase 5 migration was complete and Phase 6 deletion was safe

### Step 2: Created Phase 6 Import Boundary Test
- Added `tests/architecture/shiki-import-boundary.test.ts` to enforce final state
- The test scans the codebase and asserts:
  - ✅ No imports from `~/lib/shiki` (deprecated tilde imports)
  - ✅ No relative imports from `src/lib/shiki` (deprecated relative imports)
  - ✅ No subpath imports from `@ravenhill/shiki-core`
  - ✅ `src/lib/shiki` directory does not exist

### Step 3: Deleted Deprecated Bridge
- Removed entire `src/lib/shiki/` directory including:
  - **Module files:** `cache.ts`, `class-tokens.ts`, `config.ts`, `custom-languages.ts`, `grammars/`, `highlighter.ts`, `html.ts`, `language-aliases.ts`, `line-text-color-helpers.ts`, `line-text-color-transformer.ts`, `service.ts`, `tailwind-class-transformer.ts`, `transformers.ts`
  - **Test files:** All files under `__tests__/` (public-surface-contract.test.ts, import-boundary.test.ts, compatibility-imports.test.ts)

### Step 4: Updated Documentation
- Changed status in this traceability log from `[PLAN]` to completion report
- Documented implementation findings and rationale
- Updated goals section to mark accomplishments with checkmarks

## Verification and Testing

### Post-Deletion Audit

The Phase 6 import boundary test enforces and verifies:

```sh
# Check 1: No deprecated tilde imports
pnpm test:unit -- tests/architecture/shiki-import-boundary.test.ts
# Result: ✅ PASS - no matches found

# Check 2: No relative shiki imports
# Result: ✅ PASS - no matches found

# Check 3: No package subpath imports
# Result: ✅ PASS - no `@ravenhill/shiki-core/` subpaths found

# Check 4: Directory removed
# Result: ✅ PASS - `src/lib/shiki/` no longer exists
```

Manual verification commands (if needed):
```sh
rg "~/lib/shiki|src/lib/shiki|lib/shiki" src config packages tests
# Expected: No matches

rg "@ravenhill/shiki-core/" src config packages tests
# Expected: No matches

rg "@ravenhill/shiki-core" src config packages tests
# Expected: Only root imports
```

## Final Boundary Architecture

The following boundaries are now enforced by design, testing, and package exports:

| Responsibility                              | Location                    | Import Path                                    |
| ------------------------------------------- | --------------------------- | ---------------------------------------------- |
| Reusable Shiki infrastructure               | `@ravenhill/shiki-core`     | `import { ... } from "@ravenhill/shiki-core"`  |
| App-specific highlighting service & config | `src/lib/code-highlighting` | `import { ... } from "~/lib/code-highlighting"`|
| Astro/UI rendering for code blocks         | `src/components/ui/code`    | Direct imports within component modules        |
| **Forbidden:** Deprecated bridge            | *Deleted*                   | **No imports allowed**                         |
| **Forbidden:** Package subpaths             | N/A                         | **No `@ravenhill/shiki-core/...` allowed**     |

### Key Invariants Enforced

1. **No deprecated bridge imports** — The `src/lib/shiki/*` bridge has been completely deleted
2. **Package root-only** — All `@ravenhill/shiki-core` imports must use the root export only
3. **Boundary compliance** — The Phase 6 import boundary test enforces these rules at test time

## Acceptance Criteria Met ✅

- ✅ `src/lib/shiki/**` no longer exists
- ✅ Compatibility-only tests deleted (all `src/lib/shiki/__tests__/*` removed)
- ✅ No source, config, or test file imports from `~/lib/shiki`, `src/lib/shiki`, or `lib/shiki`
- ✅ No code imports from `@ravenhill/shiki-core/*` subpaths
- ✅ All package consumers use the root import `@ravenhill/shiki-core`
- ✅ App-specific highlighting code goes through `~/lib/code-highlighting`
- ✅ UI rendering remains under `src/components/ui/code`
- ✅ Documentation and traceability notes describe the bridge as removed, not deprecated
- ✅ Phase 6 import boundary test in place and enforces all rules

## Validation Commands

To confirm Phase 6 completion and that all tests pass:

```sh
# Phase 6 specific boundary test
pnpm test:unit -- tests/architecture/shiki-import-boundary.test.ts

# Package contract validation (Phase 5 dependencies)
pnpm run check:shiki-core

# App highlighting tests
pnpm test:unit -- src/lib/code-highlighting src/components/ui/code

# Astro rendering tests
pnpm test:astro

# Full workspace gate (all checks)
pnpm check
```

## Lessons and Assumptions Validated

- **Effective strategy:** The compatibility window strategy was highly effective; Phase 5 had already migrated all consumers, making Phase 6 deletion safe with zero code changes
- **Test-driven boundaries:** Data-driven tests that scan for forbidden patterns are more maintainable than manual code review for architectural rules
- **Package encapsulation:** The root-only package import rule is enforced by `package.json` `exports` configuration combined with test-time verification
- **No hidden behavior:** No wrapper contained behavior not already covered by Phase 5 migration tests

## Context for Future Work

If new code needs highlighting functionality:
1. For reusable Shiki infrastructure → import from `@ravenhill/shiki-core`
2. For app-configured highlighting → import from `~/lib/code-highlighting`
3. For code block rendering → use `src/components/ui/code`

Do not create new files under `src/lib/shiki/*` — that boundary was removed and must not be reintroduced.

## Related Phases

- **Phase 4** (prior): Extracted `@ravenhill/shiki-core` and created `~/lib/code-highlighting` boundary
- **Phase 5** (prior): Migrated all consumers from deprecated bridge to Phase 4 boundaries
- **Phase 6** (this): Removed deprecated bridge after compatibility window

---

*Completed by: Phase 6 implementation*  
*Date: 2026-05-10*  
*Verified by: tests/architecture/shiki-import-boundary.test.ts*
