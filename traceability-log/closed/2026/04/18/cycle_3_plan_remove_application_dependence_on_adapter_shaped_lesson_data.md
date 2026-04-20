# Cycle 3 Plan: Remove Application Dependence on Adapter-Shaped Lesson Data

## Summary

Refactor auto-navigation so the Application layer no longer depends on lesson data shaped for infrastructure convenience. Today, the boundary still exposes adapter-oriented operations such as `flatten()`, `findAdjacentByHref()`, and raw `slug` handling. In this cycle, that boundary should become domain-first: Application asks for adjacent lessons through a domain repository contract and limits itself to orchestration. Infrastructure remains responsible for translating `courseStructure` into domain data and for performing any normalization needed to satisfy the domain contract. 

This cycle should stay deliberately narrow. It is about removing application knowledge of adapter mechanics from the auto-navigation use case. It is not a redesign of breadcrumb or trail APIs, and it should not broaden into a general restructuring of lesson-catalog concerns.

## Goals

* Move adjacency lookup behind a domain-oriented repository contract.
* Remove adapter-shaped methods and fields from the Application-facing dependency.
* Keep `NavigationServiceImpl` focused on input conversion and result orchestration.
* Preserve the existing presentation output shape: `{ title, href }`.
* Keep trail-related behavior out of scope unless a small compatibility adjustment is required for compilation.

## Non-Goals

* No redesign of breadcrumb or trail flows.
* No large-scale refactor of `courseStructure`.
* No changes to the UI-facing navigation payload beyond removing leaked `slug` data from internal contracts.
* No speculative expansion of the repository API beyond what auto-navigation currently needs.

## Implementation Changes

### 1. Introduce a domain-first repository contract

Replace the current application port in `src/application/ports/LessonCatalog.ts` with a domain-oriented repository interface dedicated to navigation adjacency.

Preferred direction:

* define a repository such as `LessonNavigationRepository` in Domain;
* expose a query centred on the use case, for example:
  `findAdjacentTo(href: LessonHref): Promise<AdjacentLessons>`.

Constraints:

* do not keep `flatten()` on the Application-facing contract;
* do not keep `findAdjacentByHref(string)` as part of the new boundary;
* do not expose raw adapter DTOs or `slug: string` through this interface;
* return domain values such as `LessonHref`, `AdjacentLessons`, or other domain navigation objects.

The contract should describe what the application needs, not how infrastructure currently computes it.

### 2. Refactor `NavigationServiceImpl` around the new boundary

Update `src/application/services/NavigationServiceImpl.ts` so it depends only on the new domain repository.

Responsibilities of the service should be limited to:

* accepting the incoming `pathname`;
* converting it at the application boundary into a canonical `LessonHref`;
* delegating adjacency lookup to the repository;
* mapping the domain result into the existing presentation-facing `NavigationResult`.

Constraints:

* no flattening logic in Application;
* no slug derivation in Application;
* no path-rule recomputation in Application;
* no href normalization details beyond boundary conversion into the domain type.

After this change, `NavigationServiceImpl` should read as a thin orchestration service rather than a place where authoring-structure knowledge leaks upward. 

### 3. Keep mapping and normalization inside the adapter

Retain `src/infrastructure/adapters/LessonCatalogAdapter.ts` as the implementation owner of data-source mapping.

The adapter should:

* implement the new domain repository explicitly;
* keep using `courseStructure` and any existing domain sequencing or trail services internally;
* flatten or normalise the authoring structure privately, not through the public application boundary;
* convert raw records into domain navigation objects before returning them.

This is the right place for infrastructure-specific concerns such as:

* flattening the authored structure;
* caching the flattened lesson sequence if that remains useful;
* mapping raw lesson records into domain values;
* compensating for source-data irregularities so callers receive a clean domain contract.

`findTrailByHref(...)` should remain unchanged unless a minimal adaptation is necessary to keep the module compiling. Trail redesign belongs to a later cycle.

### 4. Preserve the presentation boundary

Keep `src/presentation/adapters/navigation-bridge.ts` as the composition root that wires the adapter to the application service.

The presentation contract should remain stable:

* UI continues to receive `{ title, href }`;
* `slug` is no longer part of the navigation-layer contract unless a concrete, non-presentation caller still requires it.

This cycle should reduce leakage into Application, not force a presentation rewrite.

## Test Plan

### Application tests

Update `src/application/services/__tests__/NavigationServiceImpl.test.ts`.

Focus the suite on orchestration only:

* mock only the new domain repository;
* verify that `resolveAutoNav(...)` converts string input into canonical `LessonHref` semantics at the boundary;
* verify first, middle, last, and missing-lesson cases using domain repository results;
* avoid asserting adapter-specific details such as flattening, slugs, or authoring-structure traversal.

The application tests should prove that the service translates inputs and forwards results correctly, not that it reimplements domain or infrastructure logic.

### Domain tests

Keep sequencing and adjacency behaviour covered at the domain level where that logic already lives.

If extra coverage is needed, add a small contract-oriented test around the shape of the repository result. Do not duplicate sequencing or normalization rules in application tests.

### Adapter integration tests

Adjust `src/infrastructure/adapters/__tests__/LessonCatalogAdapter.integration.test.ts` to verify that the adapter satisfies the new repository contract.

Focus on:

* correct adjacency results from real `courseStructure`;
* correct mapping into domain-shaped output;
* removal of any expectation that `flatten()` is part of the public Application boundary.

Retain end-to-end adjacency coverage, but align the assertions with the new contract instead of the old surface area.

### Presentation tests

Keep `src/presentation/adapters/__tests__/navigation-bridge.test.ts` stable.

Verify that:

* the UI-facing result remains `{ title, href }`;
* `slug` is not leaked through the presentation payload.

## Interface Changes

* Introduce a domain repository dedicated to lesson adjacency.
* Change `NavigationServiceImpl` to depend on that repository instead of `ILessonCatalog`.
* Keep the stable public navigation payload limited to `title` and `href`.
* Remove `slug` from navigation-layer contracts unless a real caller still depends on it.
* Remove `flatten()` and other adapter-oriented methods from the Application-facing boundary. 

## Acceptance Criteria

This cycle is complete when all of the following are true:

* Application no longer depends on `flatten()`, `findAdjacentByHref(string)`, or raw `slug` fields.
* `NavigationServiceImpl` performs only boundary conversion, delegation, and result mapping.
* The adapter implements the new domain repository and keeps all authoring-structure traversal private.
* Presentation still receives the same `{ title, href }` shape.
* Existing adjacency behaviour remains intact in first, middle, last, and missing cases.
* No breadcrumb or trail redesign was introduced beyond minimal compatibility work.

## Assumptions

* This cycle is limited to the auto-navigation use case.
* `LessonHref` is the canonical input type for adjacency queries.
* Manual DI remains local and explicit in `navigation-bridge.ts`.
* Backward compatibility matters at the presentation boundary, not at the old Application port surface. 
