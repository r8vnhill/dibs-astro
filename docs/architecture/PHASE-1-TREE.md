# Phase 1: Layered Architecture Visualization

## Current directory tree (after Phase 1)

```
src/
├── domain/                              # 🔹 Domain Layer (pure business logic)
│                                        # Content to be expanded in Phase 2
│
├── application/                         # 🟢 Application Layer (orchestration)
│   ├── ports/
│   │   ├── LessonCatalog.ts            # 📋 Port: ILessonCatalog
│   │   ├── NavigationService.ts        # 📋 Port: INavigationService
│   │   └── index.ts                    # Aggregated exports
│   │
│   └── services/
│       ├── NavigationServiceImpl.ts     # 🟢 Implementation: navigation orchestrator
│       ├── index.ts                    # Aggregated exports
│       └── __tests__/
│           └── NavigationServiceImpl.test.ts  # ✅ 5 tests (PASS)
│
├── infrastructure/                      # 🟡 Infrastructure Layer (technical details)
│   └── adapters/
│       ├── LessonCatalogAdapter.ts     # 🟡 Adapter: ILessonCatalog ← courseStructure
│       ├── index.ts                    # Aggregated exports
│       └── __tests__/
│           └── LessonCatalogAdapter.test.ts  # ✅ 4 tests (PASS)
│
├── presentation/                        # 🔴 Presentation Layer (UI) — to be integrated
│                                        # Content to be expanded in Phase 2+
│
└── (legacy; unchanged)                 # 📁 src/{components,layouts,utils,pages,etc.}
```

## Dependency flow between layers (Allowed direction)

```
Presentation
    ↓
Application
    ↓
Domain

Infrastructure
    ↑ (implements ports from Application/Domain)

Prohibited: Presentation → Infrastructure, Application → Presentation, etc.
```

## Defined interfaces / Ports

```typescript
// 📋 Port 1: Catalog access
ILessonCatalog {
  getCourseStructure(): Promise<Lesson[]>
  findByPath(pathname: string): Promise<Lesson | null>
  flatten(): Promise<Lesson[]>
}

// 📋 Port 2: Navigation resolution
INavigationService {
  resolveAutoNav(pathname: string): Promise<NavigationResult>
}
```

## Phase 1 implementations

```typescript
// 🟢 Application Service (orchestrator)
class NavigationServiceImpl implements INavigationService {
  constructor(private lessonCatalog: ILessonCatalog) {}
  async resolveAutoNav(pathname: string) { /* logic */ }
}

// 🟡 Infrastructure Adapter (implements port)
class LessonCatalogAdapter implements ILessonCatalog {
  async getCourseStructure() { /* maps courseStructure */ }
  async flatten() { /* uses flattenLessons() */ }
  async findByPath(pathname: string) { /* searches by href */ }
}
```

## TDD Tests (Phase 1)

```
NavigationServiceImpl.test.ts
├─ ✅ first lesson: previous=undefined, next=defined
├─ ✅ middle lesson: previous and next defined
├─ ✅ last lesson: next=undefined, previous=defined
├─ ✅ route not found: {}
└─ ✅ href normalization: end with /

LessonCatalogAdapter.test.ts
├─ ✅ returns course structure
├─ ✅ flattens to linear list
├─ ✅ searches by route
└─ ✅ returns null for non-existent route

Total: 9 tests
Passing: 9/9 ✅
```

## Updated configuration files

### `tsconfig.json` (new aliases)

```json
{
  "compilerOptions": {
    "paths": {
      "$domain/*": ["src/domain/*"],           // ← New
      "$application/*": ["src/application/*"], // ← New
      "$infrastructure/*": ["src/infrastructure/*"], // ← New
      "$presentation/*": ["src/presentation/*"]      // ← New
    }
  }
}
```

## Generated documentation

- ✅ `docs/architecture/adr/ADR-001-layered-architecture.md` — Architecture decision
- ✅ `docs/architecture/Phase-1-summary.md` — Detailed deliverables
- ✅ `docs/architecture/PHASE-1-TREE.md` — This file (visualization)

## File availability status

```
Completed and ready to consume in Phase 2:
├─ Structure
├─ Ports
├─ Services (Application)
├─ Adapters (Infrastructure)
├─ Tests (TDD-first, 100% pass)
└─ Documentation (ADR, summary)

Not required until Phase 2:
├─ Integration in Presentation (NotesLayout)
├─ Entities in Domain
└─ DI container / advanced factory patterns
```

---

**Phase 1 · Completed**
**Timestamp:** 2026-02-28
**Status:** ✅ Ready for Phase 2 (Isolate Domain)
