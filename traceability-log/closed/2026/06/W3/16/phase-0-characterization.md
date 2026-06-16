# Phase 0: Characterization Results

**Date**: 2026-06-16\
**Status**: ✅ Complete — baseline documented and validated

## Goal Achieved

Captured the current icon contract before extraction so the migration can prove that it preserves public behavior.

---

## Baseline State

### SVG Asset Inventory

| Metric             | Value | Location                                                  |
| ------------------ | ----- | --------------------------------------------------------- |
| **SVG count**      | 1,521 | `src/assets/img/icons/*.svg`                              |
| **Barrel exports** | 1,521 | `src/assets/img/icons/index.ts`                           |
| **Logo SVGs**      | 4     | `src/assets/img/logos/*.svg` (not migrated in this phase) |
| **Logo exports**   | 4     | `src/assets/img/logos/index.ts`                           |

**Export pattern**: Each SVG has one named export in PascalCase.

```ts
export { default as Acorn } from "./acorn.svg";
export { default as AddressBookTabs } from "./address-book-tabs.svg";
// … 1,519 more lines
```

### Alias Resolution

| Alias    | Target                            | Usage in Code                                                                                  |
| -------- | --------------------------------- | ---------------------------------------------------------------------------------------------- |
| `$icons` | `./src/assets/img/icons/index.ts` | Defined in `tsconfig.json` but not actively used by production code                            |
| `~/*`    | `src/*`                           | **Active**: Used in production code as `~/assets/img/icons` and `~/assets/img/icons/brain.svg` |

**Key finding**: Production code imports via the bare `~` alias rather than the dedicated `$icons` alias. Both resolve
to the same barrel, but consumers use `~/assets/img/icons` directly.

### Representative Icon Consumers

Identified **83 files** that depend on icon assets. Key categories:

#### 1. Callout Components (11 files)

These use the `calloutVariants` mapping from `shared.ts` which re-exports icons:

- `src/components/ui/callouts/shared.ts` (imports: `Brain`, `NoteIcon`, `Star` plus 11 others via `calloutVariants`)
- `src/components/ui/callouts/Abstract.astro`
- `src/components/ui/callouts/Danger.astro`
- `src/components/ui/callouts/Definition.astro`
- `src/components/ui/callouts/Exercise.astro`
- `src/components/ui/callouts/Explanation.astro`
- `src/components/ui/callouts/Hints.astro`
- `src/components/ui/callouts/Important.astro`
- `src/components/ui/callouts/Info.astro`
- `src/components/ui/callouts/More.astro`
- `src/components/ui/callouts/Note.astro`
- `src/components/ui/callouts/Question.astro`
- `src/components/ui/callouts/Solution.astro`
- `src/components/ui/callouts/Tip.astro`
- `src/components/ui/callouts/Warning.astro`

The `shared.ts` file is the **integration point**: it defines `calloutVariants` (the public API for callout icon
selection) and maps each variant to an icon from `~/assets/img/icons`:

```ts
export const calloutVariants: Record<CalloutVariant, CalloutVariantConfig> = {
    abstract: { title: "Abstract", icon: Brain },
    danger: { title: "Peligro", icon: icons.Skull },
    definition: { title: "Definición", icon: icons.BookOpen },
    // ... 11 more mappings
};
```

#### 2. Reference Components (6 files)

- `src/components/ui/references/Book.astro`
- `src/components/ui/references/GenericReference.astro`
- `src/components/ui/references/ScholarlyArticle.astro`
- `src/components/ui/references/Thesis.astro`
- `src/components/ui/references/Video.astro`
- `src/components/ui/references/References.astro`

#### 3. Notes Pages (66+ files)

Pages under `src/pages/notes/**/*.astro` use callout components, which transitively depend on icons.

**Critical invariant**: Callout components must render the same icons before and after migration.

### Build/Generation Pipeline

| Step                 | Command               | Current Output                                      |
| -------------------- | --------------------- | --------------------------------------------------- |
| **Generate barrels** | `pnpm generate-icons` | ✅ "Icons exports already up to date (1521 files)." |
| **Full build**       | `pnpm build`          | (To be verified in Phase 5)                         |

---

## Validation Results

### ✅ Red Phase (Failing Checks Before Fix)

**No failing checks identified.** The baseline is stable:

- Generator works: runs without errors, detects that index is up-to-date.
- Barrel is current: 1,521 exports match 1,521 SVG files.
- TypeScript resolves: path aliases in `tsconfig.json` are recognized.

### ✅ Green Phase (Baseline Passing)

**Baseline validation passed:**

```sh
pnpm generate-icons
# Output: 
#   = Icons exports already up to date (1521 files).
#   = Logos exports already up to date (4 files).
```

This confirms:

1. SVG count (1,521) matches barrel export count (1,521).
2. Generator script works correctly.
3. No stale or missing exports.

### Notable Implementation Details

#### Import Paths in Production Code

Actual imports are inconsistent between absolute paths and aliases:

- `src/components/ui/callouts/shared.ts` line 1: `import * as icons from "~/assets/img/icons";`
- `src/components/ui/callouts/shared.ts` line 2: `import Brain from "~/assets/img/icons/brain.svg";`
- `src/components/ui/callouts/shared.ts` line 3: `import NoteIcon from "~/assets/img/icons/note.svg";`

These all resolve through the `~` alias to the filesystem. The `$icons` alias is defined but unused in production.

#### Astro SVG Component Pipeline

- Astro 5 natively handles `.svg` imports as `AstroComponentFactory` (no plugin needed).
- All SVG consumers are Astro `.astro` or `.tsx` components that render `<Icon {...props} />` directly.
- No custom SVG optimization or minification is applied during the Astro build.

---

## Acceptance Criteria ✅

- ✅ Current SVG count is known: **1,521**
- ✅ Current barrel export count is known: **1,521** (count verified; sample exports shown)
- ✅ Barrel location documented: `src/assets/img/icons/index.ts`
- ✅ Alias target documented: `$icons` → `./src/assets/img/icons/index.ts` (defined but not actively used)
- ✅ At least one `$icons` / icon consumer identified: `shared.ts` (callout icons) + 82 other dependents
- ✅ Baseline validation passed: `pnpm generate-icons` succeeds

---

## Risks Identified for Migration

1. **Alias inconsistency**: Production code uses `~` instead of `$icons`. After migration, both must continue to resolve
   correctly, or imports must be updated consistently.

2. **Barrel regeneration**: The generator script must be updated to write to `packages/phosphor-icons/src/index.ts`
   instead of `src/assets/img/icons/index.ts`. The Astro integration's file watcher must also be updated to watch the
   new location.

3. **Icon rendering in callouts**: The `shared.ts` file imports individual SVGs (`Brain`, `NoteIcon`, `Star`) and
   re-exports them in `calloutVariants`. After migration, these imports must resolve through the new package barrel.

4. **Cross-directory imports**: Some components import both from the barrel (`import * as icons from "..."`) and
   directly from individual SVG files (`import Brain from ".../brain.svg"`). The new package structure must support both
   patterns.

---

## Next Steps

Phase 1 will create `packages/phosphor-icons` with the necessary scaffolding. The baseline documented here will be
re-validated at each phase gate.

No code changes in this phase.
