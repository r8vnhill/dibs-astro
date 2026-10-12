/**
 * Static (no-browser) contract checks for the proportional typography fixture.
 *
 * The fixture page is trustworthy only when it renders every required combination and keeps
 * candidate/reference pairs identical except for the font family. This JSDOM suite checks the
 * ligature, body, and heading matrices plus their content and style parity. Playwright suites
 * (`tests/e2e/typography-*.spec.ts`) check actual font loading and rendered output.
 *
 * For course readers: this is a worked example of testing generated markup structurally instead of
 * with brittle string snapshots. Assertions come from the shared model modules, keeping the page
 * and its contract checks aligned.
 */

import { JSDOM } from "jsdom";
import { expect, suite, test } from "vitest";
import {
  bodyEvaluationFamilies,
  bodyEvaluationSurfaces,
  bodyEvaluationText,
} from "~/lib/typography/body-font-evaluation-fixture";
import {
  headingEvaluationCases,
  headingEvaluationFamilies,
} from "~/lib/typography/heading-font-evaluation-fixture";
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

const getSpecimens = (document: Document): FixtureSpecimen[] =>
  [...document.querySelectorAll<FixtureSpecimen>("[data-typography-specimen=\"ligature\"]")];

const expectedPairCount = (): number =>
  proportionalFontFixtureProfiles.reduce(
    (count, profile) => count + profile.states.length * proportionalFontContract.ligatures.length,
    0,
  );

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

const findSpecimen = (
  specimens: readonly FixtureSpecimen[],
  profile: FixtureProfile,
  state: FixtureProfile["states"][number],
  ligatureId: string,
  featureMode: FeatureMode,
): FixtureSpecimen | undefined => specimens.find((specimen) =>
    specimen.dataset.typographyRole === profile.role
    && specimen.dataset.fontFamily === profile.familyId
    && specimen.dataset.typographyState === typographyStateKey(state)
    && specimen.dataset.ligatureId === ligatureId
    && specimen.dataset.featureMode === featureMode
  );

function assertCompleteMatrix(document: Document): void {
  const specimens = getSpecimens(document);

  expect(specimens).toHaveLength(expectedPairCount() * proportionalFontFeatureModes.length);
  expect(new Set(specimens.map((specimen) => specimenIdentity(specimen))).size).toBe(
    specimens.length,
  );

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
    const identity = `${profile.role}/${profile.familyId}/${
      typographyStateKey(state)
    }/${ligatureId}/${mode.id}`;

    expect(specimen, identity).toBeDefined();
    expect(specimen?.textContent, identity).toBe(source);
  }
}

function getPairMap(
  specimens: readonly FixtureSpecimen[],
): Map<string, Map<FeatureMode, FixtureSpecimen>> {
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
    expect(disabled?.getAttribute("style"), `${identity}/style`).toBe(
      enabled?.getAttribute("style"),
    );
  }
}

function assertExistingSections(document: Document): void {
  expect(document.querySelector("[data-fixture-section=\"body\"]")).not.toBeNull();
  expect(document.querySelector("[data-fixture-section=\"heading\"]")).not.toBeNull();
  expect(document.querySelector("[data-fixture-section=\"combined\"]")).not.toBeNull();
  expect(document.querySelectorAll("[data-typography-corpus=\"spanish-coverage\"]")).toHaveLength(
    6,
  );
  expect(document.querySelector("[data-font-family=\"fira-code\"]")).not.toBeNull();
}

function assertThreeRoleLessonFragment(document: Document): void {
  const review = document.querySelector<HTMLElement>("[data-visual-review=\"three-role-system\"]");
  expect(review).not.toBeNull();
  if (!review) return;
  expect(review.getAttribute("data-fixture-section")).toBe("combined");
  assertThreeRoleHeadings(review);
  assertThreeRoleProse(review);
  assertThreeRoleCode(review);
}

function assertThreeRoleHeadings(review: HTMLElement): void {
  const primaryHeading = review.querySelector("h2[data-font-family=\"dibs-slab\"]");
  expect(primaryHeading?.textContent?.trim()).toBe("Trailing lambdas (λ al final)");
  expect(primaryHeading?.getAttribute("style")).toContain("font-weight: 700");
  const subheading = review.querySelector("h3[data-font-family=\"dibs-slab\"]");
  expect(subheading?.textContent?.trim()).toBe("Sintaxis básica");
  expect(subheading?.getAttribute("style")).toContain("font-weight: 500");
}

function assertThreeRoleProse(review: HTMLElement): void {
  const prose = [
    ...review.querySelectorAll<HTMLParagraphElement>("p[data-font-family=\"dibs-sans\"]"),
  ];
  expect(prose.length).toBeGreaterThanOrEqual(2);
  expect(prose.every((paragraph) => paragraph.dataset.typographyRole === "prose")).toBe(true);
  expect(prose.every((paragraph) => paragraph.getAttribute("style")?.includes("font-weight: 400")))
    .toBe(true);
  assertProseCopy(prose);
  assertProseEmphasis(prose);
}

function assertProseCopy(prose: readonly HTMLParagraphElement[]): void {
  expect(prose[0]?.textContent?.replace(/\s+/g, " ").trim()).toBe(
    "En Kotlin, si el último parámetro de una función tiene un function type, "
      + "puedes pasar la lambda fuera de los paréntesis. Esta forma se conoce "
      + "como trailing lambda y facilita la lectura de operaciones sobre colecciones.",
  );
  expect(prose.some((paragraph) => paragraph.querySelector("em")?.textContent === "function type"))
    .toBe(true);
}

function assertProseEmphasis(prose: readonly HTMLParagraphElement[]): void {
  expect(prose.some((paragraph) => paragraph.querySelector("em")
    ?.getAttribute("style")?.includes("font-style: italic"))).toBe(true);
  expect(prose.some((paragraph) => paragraph.querySelector("strong")
    ?.textContent?.includes("último parámetro"))).toBe(true);
  expect(prose.some((paragraph) => paragraph.querySelector("strong")
    ?.getAttribute("style")?.includes("700"))).toBe(true);
  expect(prose.some((paragraph) => paragraph
    .querySelector("[data-typography-state=\"500-normal\"]")?.textContent
    ?.includes("trailing lambda"))).toBe(true);
}

function assertThreeRoleCode(review: HTMLElement): void {
  const inlineCode = review.querySelector("p code[data-font-family=\"fira-code\"]");
  expect(inlineCode?.textContent).toBe("x -> x * 2");
  expect(inlineCode?.parentElement?.dataset.typographyRole).toBe("prose");
  const codeBlock = review.querySelector("pre[data-font-family=\"fira-code\"] > code");
  expect(codeBlock?.parentElement?.dataset.typographyRole).toBe("code-block");
  expect(codeBlock?.textContent).toBe(
    "// Conventional function arguments\n"
      + "list\n    .filter({ x -> x > 10 })\n    .map({ x -> x * 2 })\n\n"
      + "// Trailing lambdas\n"
      + "list\n    .filter { x -> x > 10 }\n    .map { x -> x * 2 }",
  );
}

const normalizeEvaluationStyle = (style: string | null): string =>
  (style ?? "").replace(/font-family:\"[^\"]+\";/, "");

function assertBodyEvaluationMatrix(document: Document): void {
  const root = document.querySelector("[data-fixture-section=\"body-evaluation\"]");
  expect(root).not.toBeNull();
  expect(root?.querySelectorAll("[data-evaluation-family]")).toHaveLength(
    bodyEvaluationFamilies.length,
  );

  for (const family of bodyEvaluationFamilies) assertBodyFamilyMatrix(root, family);
  assertBodyMatrixDetails(root);
}

function assertBodyFamilyMatrix(
  root: Element | null,
  family: (typeof bodyEvaluationFamilies)[number],
): void {
  const familyRoot = root?.querySelector(`[data-evaluation-family="${family.id}"]`);
  expect(familyRoot, family.id).not.toBeNull();
  expect(familyRoot?.getAttribute("data-evaluation-kind"), family.id).toBe(family.kind);
  expect(familyRoot?.getAttribute("data-evaluation-css-family"), family.id).toBe(family.cssFamily);
  expect(familyRoot?.querySelectorAll("[data-evaluation-state]")).toHaveLength(
    family.states.length,
  );
  expect(familyRoot?.querySelectorAll("[data-evaluation-surface]")).toHaveLength(
    family.states.length * bodyEvaluationSurfaces.length,
  );
  for (const state of family.states) assertBodyStateMatrix(familyRoot, family, state);
}

function assertBodyStateMatrix(
  familyRoot: Element | null | undefined,
  family: (typeof bodyEvaluationFamilies)[number],
  state: (typeof bodyEvaluationFamilies)[number]["states"][number],
): void {
  const selector = `[data-evaluation-state="${state.weight}-${state.style}"]`;
  const stateRoot = familyRoot?.querySelector(selector);
  expect(stateRoot, `${family.id}/${state.weight}-${state.style}`).not.toBeNull();
  expect(stateRoot?.getAttribute("style"))
    .toContain("font-variant-ligatures:common-ligatures contextual");
  for (const surface of bodyEvaluationSurfaces) {
    expect(stateRoot?.querySelector(`[data-evaluation-surface="${surface.id}"]`), surface.id)
      .not.toBeNull();
  }
}

function assertBodyMatrixDetails(root: Element | null): void {
  const detailCount = bodyEvaluationFamilies.length * bodyEvaluationFamilies[0].states.length;
  expect(root?.querySelectorAll("[data-evaluation-detail=\"spanish-coverage\"]"))
    .toHaveLength(detailCount);
  expect(root?.textContent).toContain(bodyEvaluationText.callout.body);
}

type EvaluationState = { weight: number; style: string };

/** Return state styling after removing the deliberately different font-family declaration. */
const stateStyle = (familyRoot: Element | null | undefined, stateSelector: string): string =>
  normalizeEvaluationStyle(
    familyRoot?.querySelector(stateSelector)?.getAttribute("style") ?? null,
  );

/** Candidate and reference must share every surface's text and every state's non-family style. */
function assertBodyEvaluationParity(document: Document): void {
  const root = document.querySelector("[data-fixture-section=\"body-evaluation\"]");
  const [candidate, reference] = bodyEvaluationFamilies.map((family) =>
    root?.querySelector(`[data-evaluation-family="${family.id}"]`)
  );

  for (const state of bodyEvaluationFamilies[0].states as readonly EvaluationState[]) {
    assertBodyStateParity(candidate, reference, state);
  }
}

function assertBodyStateParity(
  candidate: Element | null | undefined,
  reference: Element | null | undefined,
  state: EvaluationState,
): void {
  const stateSelector = `[data-evaluation-state="${state.weight}-${state.style}"]`;
  const label = `${state.weight}-${state.style}`;
  expect(stateStyle(candidate, stateSelector), `${label}/style`)
    .toBe(stateStyle(reference, stateSelector));
  for (const surface of bodyEvaluationSurfaces) {
    assertBodySurfaceParity(candidate, reference, stateSelector, surface.id, label);
  }
}

function assertBodySurfaceParity(
  candidate: Element | null | undefined,
  reference: Element | null | undefined,
  stateSelector: string,
  surfaceId: string,
  label: string,
): void {
  const selector = `${stateSelector} [data-evaluation-surface="${surfaceId}"]`;
  const candidateText = candidate?.querySelector(selector)?.textContent;
  const referenceText = reference?.querySelector(selector)?.textContent;
  expect(candidateText, `${surfaceId}/${label}/text`).toBe(referenceText);
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
  expect(familyRoot?.getAttribute("data-heading-state"), id).toBe(
    `${evaluationCase.representativeWeight}-normal`,
  );
  expect(specimen?.tagName, `${id}/level`).toBe(evaluationCase.semanticLevel.toUpperCase());
  expect(specimen?.textContent, `${id}/text`).toBe(evaluationCase.text);
  expect(specimen?.dataset.headingSource, `${id}/source`).toBe(evaluationCase.text);
  expect(specimen?.getAttribute("style"), `${id}/synthesis`).toContain("font-style:normal;");
}

function assertHeadingEvaluationMatrix(document: Document): void {
  const root = document.querySelector("[data-fixture-section=\"heading-evaluation\"]");
  expect(root).not.toBeNull();
  expect(root?.querySelectorAll("[data-heading-case]"))
    .toHaveLength(headingEvaluationCases.length);
  for (const evaluationCase of headingEvaluationCases) assertHeadingCase(root, evaluationCase);
  expect(root?.querySelectorAll("[data-heading-state-matrix-entry]")).toHaveLength(
    headingEvaluationFamilies.length * proportionalFontContract.roles.heading.states.length,
  );
}

function assertHeadingCase(root: Element | null, evaluationCase: HeadingCase): void {
  const caseRoot = root?.querySelector(`[data-heading-case="${evaluationCase.id}"]`);
  expect(caseRoot, evaluationCase.id).not.toBeNull();
  expect(caseRoot?.getAttribute("data-heading-level"), evaluationCase.id)
    .toBe(evaluationCase.semanticLevel);
  expect(caseRoot?.getAttribute("data-heading-weight"), evaluationCase.id)
    .toBe(String(evaluationCase.representativeWeight));
  expect(caseRoot?.querySelectorAll("[data-heading-family]")).toHaveLength(
    headingEvaluationFamilies.length,
  );
  for (const family of headingEvaluationFamilies) {
    assertHeadingSpecimen(caseRoot, evaluationCase, family);
  }
}

function assertHeadingLayoutAndToc(document: Document): void {
  const layout = document.querySelector("[data-heading-layout]");
  expect(layout).not.toBeNull();
  expect(layout?.querySelector("[data-heading-reading-column]")).not.toBeNull();
  expect(layout?.querySelector("[data-heading-toc]")).not.toBeNull();

  const expectedH2Cases = headingEvaluationCases.filter(({ semanticLevel }) =>
    semanticLevel === "h2"
  );
  expect(layout?.querySelectorAll("[data-heading-toc-entry]"))
    .toHaveLength(expectedH2Cases.length);
  for (const evaluationCase of expectedH2Cases) {
    const entry = layout?.querySelector(`[data-heading-toc-case="${evaluationCase.id}"]`);
    expect(entry?.textContent?.trim(), evaluationCase.id).toBe(evaluationCase.text);
  }
}

suite("given the proportional typography fixture", () => {
  test(
    "then each contract combination has disabled and enabled specimens",
    async () => assertCompleteMatrix(await renderFixture()),
  );

  test(
    "then each disabled/enabled pair shares its rendering attributes and source text",
    async () => assertPairParity(await renderFixture()),
  );

  test(
    "then the prose, Spanish coverage, and combined-system sections remain present",
    async () => assertExistingSections(await renderFixture()),
  );

  test(
    "then the combined system presents the Kotlin excerpt with three-role semantic markup",
    async () => assertThreeRoleLessonFragment(await renderFixture()),
  );

  test(
    "then the body/UI comparison renders every surface for both families and states",
    async () => assertBodyEvaluationMatrix(await renderFixture()),
  );

  test(
    "then candidate and reference surfaces keep identical content and typography settings",
    async () => assertBodyEvaluationParity(await renderFixture()),
  );

  test(
    "then heading cases have paired candidate/reference specimens and native states",
    async () => assertHeadingEvaluationMatrix(await renderFixture()),
  );

  test("then heading text is represented in the constrained reading layout and TOC", async () => {
    assertHeadingLayoutAndToc(await renderFixture());
  });
});
