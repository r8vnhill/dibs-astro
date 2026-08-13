import { expectTypeOf, test } from "vitest";

test("does not expose DIBS-specific curriculum vocabulary from the package root", () => {
    // @ts-expect-error CurriculumLanguage is DIBS policy, not a host-agnostic content-core contract.
    expectTypeOf<import("@ravenhill/content-core").CurriculumLanguage>().not.toBeAny();

    // @ts-expect-error CurriculumMaterialKind is DIBS policy, not a host-agnostic content-core contract.
    expectTypeOf<import("@ravenhill/content-core").CurriculumMaterialKind>().not.toBeAny();

    // @ts-expect-error PublicationStatus is DIBS policy, not a host-agnostic content-core contract.
    expectTypeOf<import("@ravenhill/content-core").PublicationStatus>().not.toBeAny();
});
