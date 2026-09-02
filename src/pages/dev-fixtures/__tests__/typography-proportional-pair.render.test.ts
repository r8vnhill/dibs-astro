/**
 * Static contract checks for the temporary fixture.
 *
 * Browser tests separately verify font loading and raster output; this suite keeps the generated HTML matrix complete
 * before a browser is involved.
 */

import { JSDOM } from "jsdom";
import { expect, suite, test } from "vitest";
import {
    bodyEvaluationFamilies,
    bodyEvaluationSurfaces,
    bodyEvaluationText,
} from "~/lib/typography/body-font-evaluation-fixture";
import { proportionalFontContract } from "~/lib/typography/proportional-font-contract";
import {
    proportionalFontFeatureModes,
    proportionalFontFixtureProfiles,
    typographyStateKey,
} from "~/lib/typography/proportional-font-fixture";
import { createAstroRenderer } from "~/test-utils/astro-render";
import TypographyFixture from "../typography-proportional-pair.astro";

type FixtureSpecimen = HTMLElement;
type FixtureProfile = (typeof proportionalFontFixtureProfiles)[number];
type FeatureMode = (typeof proportionalFontFeatureModes)[number]["id"];

async function renderFixture(): Promise<Document> {
    const render = await createAstroRenderer<Record<string, never>>(TypographyFixture);
    const html = await render({}, {
        request: new Request("https://dibs.ravenhill.cl/dev-fixtures/typography-proportional-pair/"),
    });

    return new JSDOM(html).window.document;
}

function getSpecimens(document: Document): FixtureSpecimen[] {
    return [...document.querySelectorAll<FixtureSpecimen>("[data-typography-specimen=\"ligature\"]")];
}

function expectedPairCount(): number {
    return proportionalFontFixtureProfiles.reduce(
        (count, profile) => count + profile.states.length * proportionalFontContract.ligatures.length,
        0,
    );
}

function specimenIdentity(specimen: FixtureSpecimen, includeMode = true): string {
    const identity = [
        specimen.dataset.typographyRole,
        specimen.dataset.fontFamily,
        specimen.dataset.typographyState,
        specimen.dataset.ligatureId,
    ];
    if (includeMode) identity.push(specimen.dataset.featureMode);
    return identity.join("/");
}

function findSpecimen(
    specimens: readonly FixtureSpecimen[],
    profile: FixtureProfile,
    state: FixtureProfile["states"][number],
    ligatureId: string,
    featureMode: FeatureMode,
): FixtureSpecimen | undefined {
    return specimens.find((specimen) =>
        specimen.dataset.typographyRole === profile.role
        && specimen.dataset.fontFamily === profile.familyId
        && specimen.dataset.typographyState === typographyStateKey(state)
        && specimen.dataset.ligatureId === ligatureId
        && specimen.dataset.featureMode === featureMode
    );
}

function assertCompleteMatrix(document: Document): void {
    const specimens = getSpecimens(document);

    expect(specimens).toHaveLength(expectedPairCount() * proportionalFontFeatureModes.length);
    expect(new Set(specimens.map((specimen) => specimenIdentity(specimen))).size).toBe(specimens.length);

    for (const profile of proportionalFontFixtureProfiles) {
        for (const state of profile.states) {
            for (const ligature of proportionalFontContract.ligatures) {
                assertLigatureModes(specimens, profile, state, ligature.id, ligature.source);
            }
        }
    }
}

function assertLigatureModes(
    specimens: readonly FixtureSpecimen[],
    profile: FixtureProfile,
    state: FixtureProfile["states"][number],
    ligatureId: string,
    source: string,
): void {
    for (const mode of proportionalFontFeatureModes) {
        const specimen = findSpecimen(specimens, profile, state, ligatureId, mode.id);
        const identity = `${profile.role}/${profile.familyId}/${typographyStateKey(state)}/${ligatureId}/${mode.id}`;

        expect(specimen, identity).toBeDefined();
        expect(specimen?.textContent, identity).toBe(source);
    }
}

function getPairMap(specimens: readonly FixtureSpecimen[]): Map<string, Map<FeatureMode, FixtureSpecimen>> {
    const pairs = new Map<string, Map<FeatureMode, FixtureSpecimen>>();

    for (const specimen of specimens) {
        const mode = specimen.dataset.featureMode as FeatureMode | undefined;
        if (!mode) throw new Error(`Missing feature mode for ${specimenIdentity(specimen, false)}`);

        const identity = specimenIdentity(specimen, false);
        const pair = pairs.get(identity) ?? new Map<FeatureMode, FixtureSpecimen>();
        pair.set(mode, specimen);
        pairs.set(identity, pair);
    }

    return pairs;
}

function assertPairParity(document: Document): void {
    for (const [identity, pair] of getPairMap(getSpecimens(document))) {
        const disabled = pair.get("disabled");
        const enabled = pair.get("enabled");

        expect(disabled, `${identity}/disabled`).toBeDefined();
        expect(enabled, `${identity}/enabled`).toBeDefined();
        expect(disabled?.textContent, `${identity}/source`).toBe(enabled?.textContent);
        expect(disabled?.getAttribute("style"), `${identity}/style`).toBe(enabled?.getAttribute("style"));
    }
}

function assertExistingSections(document: Document): void {
    expect(document.querySelector("[data-fixture-section=\"body\"]")).not.toBeNull();
    expect(document.querySelector("[data-fixture-section=\"heading\"]")).not.toBeNull();
    expect(document.querySelector("[data-fixture-section=\"combined\"]")).not.toBeNull();
    expect(document.querySelectorAll("[data-typography-corpus=\"spanish-coverage\"]")).toHaveLength(6);
    expect(document.querySelector("[data-font-family=\"fira-code\"]")).not.toBeNull();
}

function normalizeEvaluationStyle(style: string | null): string {
    return (style ?? "").replace(/font-family:\"[^\"]+\";/, "");
}

function assertBodyEvaluationMatrix(document: Document): void {
    const root = document.querySelector("[data-fixture-section=\"body-evaluation\"]");
    expect(root).not.toBeNull();
    expect(root?.querySelectorAll("[data-evaluation-family]")).toHaveLength(bodyEvaluationFamilies.length);

    for (const family of bodyEvaluationFamilies) {
        const familyRoot = root?.querySelector(`[data-evaluation-family="${family.id}"]`);
        expect(familyRoot, family.id).not.toBeNull();
        expect(familyRoot?.getAttribute("data-evaluation-kind"), family.id).toBe(family.kind);
        expect(familyRoot?.getAttribute("data-evaluation-css-family"), family.id).toBe(family.cssFamily);

        const states = familyRoot?.querySelectorAll("[data-evaluation-state]") ?? [];
        expect(states, `${family.id}/states`).toHaveLength(family.states.length);
        expect(familyRoot?.querySelectorAll("[data-evaluation-surface]")).toHaveLength(
            family.states.length * bodyEvaluationSurfaces.length,
        );

        for (const state of family.states) {
            const stateRoot = familyRoot?.querySelector(`[data-evaluation-state="${state.weight}-${state.style}"]`);
            expect(stateRoot, `${family.id}/${state.weight}-${state.style}`).not.toBeNull();
            expect(stateRoot?.getAttribute("style"), `${family.id}/${state.weight}-${state.style}/features`).toContain(
                "font-variant-ligatures:common-ligatures contextual",
            );

            for (const surface of bodyEvaluationSurfaces) {
                const surfaceRoot = stateRoot?.querySelector(`[data-evaluation-surface="${surface.id}"]`);
                expect(surfaceRoot, `${family.id}/${state.weight}-${state.style}/${surface.id}`).not.toBeNull();
            }
        }
    }

    expect(root?.querySelectorAll("[data-evaluation-detail=\"spanish-coverage\"]")).toHaveLength(
        bodyEvaluationFamilies.length * bodyEvaluationFamilies[0].states.length,
    );
    expect(root?.textContent).toContain(bodyEvaluationText.callout.body);
}

function assertBodyEvaluationParity(document: Document): void {
    const root = document.querySelector("[data-fixture-section=\"body-evaluation\"]");
    const families = bodyEvaluationFamilies.map((family) =>
        root?.querySelector(`[data-evaluation-family="${family.id}"]`)
    );

    for (let stateIndex = 0; stateIndex < bodyEvaluationFamilies[0].states.length; stateIndex += 1) {
        const state = bodyEvaluationFamilies[0].states[stateIndex]!;
        for (const surface of bodyEvaluationSurfaces) {
            const specimens = families.map((familyRoot) =>
                familyRoot?.querySelector(
                    `[data-evaluation-state="${state.weight}-${state.style}"] [data-evaluation-surface="${surface.id}"]`,
                )
            );

            expect(specimens[0]?.textContent, `${surface.id}/${state.weight}-${state.style}/text`).toBe(
                specimens[1]?.textContent,
            );
            expect(
                normalizeEvaluationStyle(
                    families[0]?.querySelector(`[data-evaluation-state="${state.weight}-${state.style}"]`)
                        ?.getAttribute(
                            "style",
                        ) ?? null,
                ),
                `${surface.id}/${state.weight}-${state.style}/style`,
            ).toBe(
                normalizeEvaluationStyle(
                    families[1]?.querySelector(`[data-evaluation-state="${state.weight}-${state.style}"]`)
                        ?.getAttribute(
                            "style",
                        ) ?? null,
                ),
            );
        }
    }
}

suite("given the proportional typography fixture", () => {
    test("then every contract role-state-ligature combination has one disabled and one enabled specimen", async () => {
        assertCompleteMatrix(await renderFixture());
    });

    test("then each disabled/enabled pair shares its rendering attributes and source text", async () => {
        assertPairParity(await renderFixture());
    });

    test("then the existing prose, Spanish coverage, and combined-system sections remain present", async () => {
        assertExistingSections(await renderFixture());
    });

    test("then the body/UI comparison renders every surface for both families and every state", async () => {
        assertBodyEvaluationMatrix(await renderFixture());
    });

    test("then candidate and reference surfaces preserve identical source content and typography settings", async () => {
        assertBodyEvaluationParity(await renderFixture());
    });
});
