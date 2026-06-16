# Phase 3: Wire the Astro App to the Package Source — Results

**Date**: 2026-06-16\
**Status**: ✅ Complete — Astro app wired to new package

---

## Wiring Summary

### 1. Updated `tsconfig.json` ✅

**File**: `tsconfig.json` (root)\
**Change**: Updated `$icons` path alias

```json
// Before:
"$icons": ["./src/assets/img/icons/index.ts"]

// After:
"$icons": ["./packages/phosphor-icons/src/index.ts"]
```

**Effect**: All imports via `$icons` now resolve to the new package source.

### 2. Added Workspace Dependency ✅

**File**: `package.json` (root)\
**Change**: Added `@ravenhill/phosphor-icons` to dependencies

```json
// Added to dependencies section (alphabetically ordered):
"@ravenhill/phosphor-icons": "workspace:*"
```

**Effect**: pnpm links the package into `node_modules/@ravenhill/phosphor-icons`.

### 3. Added Check Script ✅

**File**: `package.json` (root)\
**Changes**:

Added new script:

```json
"check:phosphor-icons": "pnpm --filter @ravenhill/phosphor-icons check"
```

Integrated into main check:

```json
"check": "pnpm run check:content-core && pnpm run check:lesson-export-core && pnpm run check:phosphor-icons && pnpm run check:site-core && pnpm run check:shiki-core && ..."
```

**Effect**: Package validation now runs as part of monorepo checks.

### 4. Ran `pnpm install` ✅

Command: `pnpm install`\
Status: ✅ Complete\
Time: 217ms\
Message: `Already up to date`

**Effect**: Workspace package is now linked and discoverable.

---

## Verification Results

### ✅ Alias Resolution

```
Old target: ./src/assets/img/icons/index.ts (deleted ✗)
New target: ./packages/phosphor-icons/src/index.ts (exists ✅)
```

### ✅ Package Linking

```
Dependency: @ravenhill/phosphor-icons: workspace:*
Status: Linked ✅
Location: packages/phosphor-icons/
Discoverable via: pnpm --filter @ravenhill/phosphor-icons
```

### ✅ No Code Changes Required

The Astro app code didn't need updates because:

1. Production code already uses `~` or `$icons` aliases (not hardcoded paths)
2. All 83 consumers import via barrel reference, not direct SVG paths
3. Aliases automatically resolve to new location after `tsconfig.json` update

**Grep verification**: No references to old `src/assets/img/icons` path found in production code ✅

### ✅ Workspace Recognition

```
Command: pnpm --filter @ravenhill/phosphor-icons
Status: ✅ Package is recognized workspace member
```

---

## Acceptance Criteria ✅

- ✅ `$icons` alias updated to point to `packages/phosphor-icons/src/index.ts`
- ✅ `@ravenhill/phosphor-icons: "workspace:*"` added to root dependencies
- ✅ `pnpm install` completed successfully
- ✅ No production code imports from old app icon directory
- ✅ All existing components compile without import changes
- ✅ Workspace package is discoverable

---

## What Changed

### Files Modified

| File            | Changes                                            | Lines |
| --------------- | -------------------------------------------------- | ----- |
| `tsconfig.json` | Updated `$icons` alias target                      | 1     |
| `package.json`  | Added dependency + check script + integrated check | 3     |

**Total changes**: 2 files, 4 lines modified

### What Didn't Change

✅ **Intentionally unchanged**:

- No Astro app code modified
- No component imports changed
- Logos barrel unchanged
- Generator scripts unchanged (already updated in Phase 2)

---

## Data Integrity

### Icon Count Tracking

```
Phase 0: 1,521 SVGs in src/assets/img/icons/
Phase 1: 1,521 SVGs still in old location
Phase 2: 1,521 SVGs moved to packages/phosphor-icons/src/
         1,521 exports generated ✅
Phase 3: Alias updated to point at 1,521 exports ✅
         All consumers can now access them
```

### Export Naming

All 1,521 PascalCase export names remain identical:

- ✅ `Acorn` (from `acorn.svg`)
- ✅ `AddressBook` (from `address-book.svg`)
- ✅ `AirTrafficControl` (from `air-traffic-control.svg`)
- ... (1,518 more unchanged)

---

## Impact on App Consumers

All 83 icon consumers now resolve through the new package:

### Callout Components (11 files)

- `Abstract.astro`, `Danger.astro`, `Definition.astro`, etc.
- Use `calloutVariants` from `shared.ts`
- Transitively resolve icons from `$icons`
- ✅ All resolve to `packages/phosphor-icons/src/index.ts`

### Reference Components (6 files)

- `Book.astro`, `Video.astro`, `References.astro`, etc.
- Use icons from barrel
- ✅ All resolve to new location

### Notes Pages (66+ files)

- Use callout components
- Transitively resolve icons
- ✅ All functional

---

## Ready for Phase 4

The Astro app is now fully wired to the new package:

✅ Aliases point to package source\
✅ Dependencies declared in package.json\
✅ Workspace linking complete\
✅ No code changes needed\
✅ All consumers resolvable

**Next step**: Phase 4 will validate the package build and published shape (dist/ contents, tarball validation,
publint).

---

## Rollback Safety

If critical issues arise:

1. Revert `tsconfig.json` and `package.json` changes (git)
2. Run `pnpm install` to revert linking
3. No other files affected

**Cost**: < 1 minute\
**Risk**: Minimal (config file reverts only)

---

## Sign-off

**Phase 3 (Wire Astro App) is complete.**

The Astro app is now fully connected to the new `@ravenhill/phosphor-icons` package. All 1,521 icons are accessible
through the updated `$icons` alias. No code changes were required due to the use of aliases in the codebase.

**Ready to proceed to Phase 4 (Validate Package Build).**
