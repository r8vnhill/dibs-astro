/**
 * Static (no-browser) contract checks for the proportional typography fixture.
 *
 * The fixture page is only trustworthy evidence if it renders *every* combination the typography
 * contract requires and renders each candidate/reference pair identically except for the font
 * family. This suite renders the `.astro` page to HTML with JSDOM and asserts exactly that: the full
 * ligature matrix, the body and heading comparison matrices, and their content/style parity. The
 * Playwright suites (`tests/e2e/typography-*.spec.ts`) cover what a DOM cannot: real font loading and
 * rasterised output.
 *
 * For course readers: this is a worked example of testing generated markup structurally instead of
 * with brittle string snapshots --- every assertion is derived from the shared model modules, so the
 * test and the page cannot drift apart.
 */

import { JSDOM } from "jsdom";
import { expect, suite, test } from "vitest";
import {
    bodyEvaluationFamilies,
    bodyEvaluationSurfaces,
    bodyEvaluationText,
} from "~/lib/typography/body-font-evaluation-fixture";
import { headingEvaluationCases, headingEvaluationFamilies } from "~/lib/typography/heading-font-evaluation-fixture";
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

type EvaluationState = { weight: number; style: string };

/** Style string of a family's state wrapper, with the (deliberately differing) font-family removed. */
function stateStyle(familyRoot: Element | null | undefined, stateSelector: string): string {
    return normalizeEvaluationStyle(familyRoot?.querySelector(stateSelector)?.getAttribute("style") ?? null);
}

/** Candidate and reference must share every surface's text and every state's non-family style. */
function assertBodyEvaluationParity(document: Document): void {
    const root = document.querySelector("[data-fixture-section=\"body-evaluation\"]");
    const [candidate, reference] = bodyEvaluationFamilies.map((family) =>
        root?.querySelector(`[data-evaluation-family="${family.id}"]`)
    );

    for (const state of bodyEvaluationFamilies[0].states as readonly EvaluationState[]) {
        const stateSelector = `[data-evaluation-state="${state.weight}-${state.style}"]`;
        const label = `${state.weight}-${state.style}`;
        expect(stateStyle(candidate, stateSelector), `${label}/style`).toBe(stateStyle(reference, stateSelector));

        for (const surface of bodyEvaluationSurfaces) {
            const surfaceSelector = `${stateSelector} [data-evaluation-surface="${surface.id}"]`;
            expect(candidate?.querySelector(surfaceSelector)?.textContent, `${surface.id}/${label}/text`).toBe(
                reference?.querySelector(surfaceSelector)?.textContent,
            );
        }
    }
}

type HeadingCase = (typeof headingEvaluationCases)[number];
type HeadingFamily = (typeof headingEvaluationFamilies)[number];

/** One candidate/reference cell: right element, right text, and synthesis disabled. */
function assertHeadingSpecimen(
    caseRoot: Element | null | undefined,
    evaluationCase: HeadingCase,
    family: HeadingFamily,
) {
    const familyRoot = caseRoot?.querySelector(`[data-heading-family="${family.id}"]`);
    const specimen = familyRoot?.querySelector<HTMLElement>("[data-heading-specimen]");
    const id = `${evaluationCase.id}/${family.id}`;

    expect(familyRoot, id).not.toBeNull();
    expect(familyRoot?.getAttribute("data-heading-state"), id).toBe(`${evaluationCase.representativeWeight}-normal`);
    expect(specimen?.tagName, `${id}/level`).toBe(evaluationCase.semanticLevel.toUpperCase());
    expect(specimen?.textContent, `${id}/text`).toBe(evaluationCase.text);
    expect(specimen?.dataset.headingSource, `${id}/source`).toBe(evaluationCase.text);
    expect(specimen?.getAttribute("style"), `${id}/synthesis`).toContain("font-style:normal;");
}

function assertHeadingEvaluationMatrix(document: Document): void {
    const root = document.querySelector("[data-fixture-section=\"heading-evaluation\"]");
    expect(root).not.toBeNull();
    expect(root?.querySelectorAll("[data-heading-case]")).toHaveLength(headingEvaluationCases.length);

    for (const evaluationCase of headingEvaluationCases) {
        const caseRoot = root?.querySelector(`[data-heading-case="${evaluationCase.id}"]`);
        expect(caseRoot, evaluationCase.id).not.toBeNull();
        expect(caseRoot?.getAttribute("data-heading-level"), evaluationCase.id).toBe(evaluationCase.semanticLevel);
        expect(caseRoot?.getAttribute("data-heading-weight"), evaluationCase.id).toBe(
            String(evaluationCase.representativeWeight),
        );
        expect(caseRoot?.querySelectorAll("[data-heading-family]")).toHaveLength(headingEvaluationFamilies.length);

        for (const family of headingEvaluationFamilies) {
            assertHeadingSpecimen(caseRoot, evaluationCase, family);
        }
    }

    expect(root?.querySelectorAll("[data-heading-state-matrix-entry]")).toHaveLength(
        headingEvaluationFamilies.length * proportionalFontContract.roles.heading.states.length,
    );
}

function assertHeadingLayoutAndToc(document: Document): void {
    const layout = document.querySelector("[data-heading-layout]");
    expect(layout).not.toBeNull();
    expect(layout?.querySelector("[data-heading-reading-column]")).not.toBeNull();
    expect(layout?.querySelector("[data-heading-toc]")).not.toBeNull();

    const expectedH2Cases = headingEvaluationCases.filter(({ semanticLevel }) => semanticLevel === "h2");
    expect(layout?.querySelectorAll("[data-heading-toc-entry]")).toHaveLength(expectedH2Cases.length);
    for (const evaluationCase of expectedH2Cases) {
        const entry = layout?.querySelector(`[data-heading-toc-case="${evaluationCase.id}"]`);
        expect(entry?.textContent?.trim(), evaluationCase.id).toBe(evaluationCase.text);
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

    test("then candidate and reference surfaces keep identical content and typography settings", async () => {
        assertBodyEvaluationParity(await renderFixture());
    });

    test("then every heading case has paired candidate/reference specimens and native states", async () => {
        assertHeadingEvaluationMatrix(await renderFixture());
    });

    test("then heading text is represented in the constrained reading layout and TOC", async () => {
        assertHeadingLayoutAndToc(await renderFixture());
    });
});
