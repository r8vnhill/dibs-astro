# Phosphor Icons Extraction: Migration Status

**Project**: Extract Phosphor icons into `@ravenhill/phosphor-icons`\
**Started**: 2026-06-16\
**Current Phase**: ✅ Phase 1 (Package Boundary) — Complete

---

## Phase Breakdown

| Phase | Goal                                           | Status      | Evidence                                                   |
| ----- | ---------------------------------------------- | ----------- | ---------------------------------------------------------- |
| **0** | Document baseline; verify current SVG contract | ✅ Complete | [phase-0-characterization.md](phase-0-characterization.md) |
| **1** | Create package scaffold without moving files   | ✅ Complete | [phase-1-scaffold.md](phase-1-scaffold.md)                 |
| **2** | Move SVGs; regenerate barrel                   | ⏳ Pending  | —                                                          |
| **3** | Wire Astro app to package source via alias     | ⏳ Pending  | —                                                          |
| **4** | Validate package build and published shape     | ⏳ Pending  | —                                                          |
| **5** | Validate end-to-end Astro integration          | ⏳ Pending  | —                                                          |

---

## Phase 0 Results

**Baseline Metrics**:

- SVG count: **1,521** ✅
- Barrel exports: **1,521** ✅
- Barrel location: `src/assets/img/icons/index.ts` ✅
- Icon consumers: **83 files** (callouts + pages) ✅
- Generator baseline: `pnpm generate-icons` passes ✅

**Key Findings**:

1. Production code uses `~` alias, not `$icons` (both resolve to same barrel).
2. Critical integration point is `src/components/ui/callouts/shared.ts` (defines `calloutVariants`).
3. No failing checks; baseline is stable.

**Documentation**:

- Phase 0 plan:
  [extract_phosphor_icons_into_ravenhill_phosphor_icons.md](extract_phosphor_icons_into_ravenhill_phosphor_icons.md)
  (lines 26–92)
- Phase 0 results: [phase-0-characterization.md](phase-0-characterization.md)

---

## Architecture Notes

**Current State**:

```
src/assets/img/icons/
  ├── acorn.svg
  ├── address-book.svg
  └── … (1,519 more)
  └── index.ts (auto-generated barrel, 1,521 exports)

tsconfig.json:
  $icons -> ./src/assets/img/icons/index.ts
```

**Target State After Migration**:

```
packages/phosphor-icons/
  ├── src/
  │   ├── index.ts (auto-generated barrel)
  │   ├── acorn.svg
  │   ├── address-book.svg
  │   └── … (1,519 more)
  │   └── svg.d.ts
  ├── dist/
  │   ├── index.js (re-exports with external SVGs)
  │   ├── index.d.ts
  │   ├── acorn.svg
  │   └── … (1,519 more, copied post-build)
  └── (tsup, package.json, etc.)

tsconfig.json:
  $icons -> ./packages/phosphor-icons/src/index.ts

Root package.json:
  @ravenhill/phosphor-icons: workspace:*
```

---

## Next Steps

**Phase 1: Create Package Boundary**

- [ ] Create `packages/phosphor-icons/` directory structure
- [ ] Write `package.json` (following `shiki-core` conventions)
- [ ] Write `tsconfig.json` with `src/svg.d.ts`
- [ ] Write `tsup.config.ts` with `external: [/\.svg$/]`
- [ ] Write validation scripts (`assert-pack-files.mjs`, `copy-assets.mjs`)
- [ ] Write `README.md` and `AGENTS.md`

**Phase 2: Move Assets**

- [ ] Move 1,521 SVG files from `src/assets/img/icons/` to `packages/phosphor-icons/src/`
- [ ] Update `generate-icons-index.js`: `ASSET_DIRS.icons` → `packages/phosphor-icons/src`
- [ ] Update `config/integrations/generate-icons.ts`: `ICONS_DIR` URL
- [ ] Run `pnpm generate-icons` to generate barrel in new location
- [ ] Delete old `src/assets/img/icons/` directory

**Phase 3: Wire Astro App**

- [ ] Update root `tsconfig.json`: `$icons` alias → `./packages/phosphor-icons/src/index.ts`
- [ ] Add `@ravenhill/phosphor-icons: "workspace:*"` to root `package.json`
- [ ] Run `pnpm install`
- [ ] Verify imports still resolve

**Phase 4: Validate Package**

- [ ] Run `pnpm --filter @ravenhill/phosphor-icons build`
- [ ] Verify `dist/` has both JS barrel and 1,521 SVG files
- [ ] Run pack validation: `pnpm --filter @ravenhill/phosphor-icons pack:check`
- [ ] Run `publint`: `pnpm --filter @ravenhill/phosphor-icons lint`

**Phase 5: Validate Integration**

- [ ] Run `pnpm dev` and check icon generation logs
- [ ] Verify callout pages render icons correctly
- [ ] Run `pnpm build` and check production output

---

## Risk Mitigation

| Risk                                      | Mitigation                                                             |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| Silent SVG count drift during migration   | Phase 0 baseline (1,521) + count assertions in `assert-pack-files.mjs` |
| Import path inconsistency after migration | Verify all 83 consumers resolve correctly before Phase 3 complete      |
| Barrel generation to wrong location       | Update generator paths before running `pnpm generate-icons`            |
| SVG files lost during copy                | `copy-assets.mjs` with `Promise.all` + post-copy count assertion       |
| Package doesn't publish correctly         | `publint` + pack validation + SVG parity check                         |

---

## Rollback Plan

If critical issues arise before Phase 4 complete:

1. Delete `packages/phosphor-icons/`
2. Restore `src/assets/img/icons/` (if deleted)
3. Revert changes to `generate-icons-index.js`, `generate-icons.ts`, `tsconfig.json`
4. Run `pnpm generate-icons` to restore barrel
5. No Astro app consumers affected; baseline preserved

If critical issues arise after Phase 3 (alias updated):

1. Revert `tsconfig.json` `$icons` alias and `package.json` dependency changes
2. Run `pnpm install`
3. Keep `packages/phosphor-icons/` as reference (no rebuild required)

---

## Related Documents

- **Plan**:
  [extract_phosphor_icons_into_ravenhill_phosphor_icons.md](extract_phosphor_icons_into_ravenhill_phosphor_icons.md)
- **Phase 0 Characterization**: [phase-0-characterization.md](phase-0-characterization.md)
- **Implementation Plan (Claude-generated)**:
  [../../../.claude/plans/i-want-to-package-mutable-key.md](../../../.claude/plans/i-want-to-package-mutable-key.md)
