import type { CurriculumConcept, CurriculumFacets, CurriculumUnit } from "../types";
import { assertType, expectTypeOf, test } from "vitest";

test.each([
    { level: ["advanced"], format: ["lecture"], track: ["theory"] },
    { audience: ["undergraduate"], modality: ["async"] },
    { difficulty: ["intro", "core"], module: ["data-structures"] },
])("given arbitrary facet dimensions %j, then a curriculum unit accepts them", (facets) => {
    assertType<CurriculumUnit>({
        id: "unit",
        title: "Unit",
        conceptIds: [],
        facets,
    });
});

test("given host-specific metadata, then the host can specialize Metadata", () => {
    type HostMetadata = Readonly<{ language: string }>;

    assertType<CurriculumUnit<HostMetadata>>({
        id: "data-abstraction",
        title: "Data abstraction",
        conceptIds: ["abstraction"],
        facets: { level: ["advanced"] },
        metadata: { language: "es" },
    });
});

test("given no metadata, then CurriculumUnit remains usable without a generic argument", () => {
    assertType<CurriculumUnit>({
        id: "data-abstraction",
        title: "Data abstraction",
        conceptIds: ["abstraction"],
        facets: { level: ["advanced"] },
    });
});

test("given readonly facet arrays, then no mutable collection is required", () => {
    const unit = {
        id: "data-abstraction",
        title: "Data abstraction",
        conceptIds: ["abstraction"],
        facets: {
            level: ["advanced"],
            format: ["lecture"],
            track: ["theory"],
        },
    } as const satisfies CurriculumUnit;

    expectTypeOf(unit.conceptIds).toMatchTypeOf<readonly string[]>();
    expectTypeOf(unit.facets).toMatchTypeOf<CurriculumFacets>();
});

test("given a concept identifier, then CurriculumConcept provides the corresponding reusable concept entity", () => {
    assertType<CurriculumConcept>({ id: "abstraction", title: "Abstraction" });
});
