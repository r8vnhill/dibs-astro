/**
 * Attribute each canonical Spanish character to its rendered face in Chromium.
 *
 * The fixture exposes one span per character, while the contract remains the corpus source. CDP is
 * used only here because Firefox does not implement this Chromium-specific font inspection API.
 */
import { expect, type Page } from "@playwright/test";
import { proportionalFontContract } from "../../src/lib/typography/proportional-font-contract";
import {
  proportionalFontFixtureProfiles,
} from "../../src/lib/typography/proportional-font-fixture";
import {
  type PlatformFont,
  readRenderedFontsForNodes,
} from "./typography-system-evaluation/metrics";

export type GlyphAttribution = Readonly<{
  role: string;
  state: string;
  character: string;
  computedFamily: string;
  glyphIndex: number;
  fonts: readonly PlatformFont[];
}>;

type GlyphProbe = Omit<GlyphAttribution, "fonts">;

type GlyphProfile = (typeof proportionalFontFixtureProfiles)[number];
type GlyphState = GlyphProfile["states"][number];

type GlyphAttributionContext = Readonly<{
  profile: GlyphProfile;
  state: GlyphState;
  glyphs: readonly GlyphProbe[];
  reports: readonly ReadonlyArray<PlatformFont>[];
}>;

type GlyphAttributionInput = Readonly<{
  profile: GlyphProfile;
  state: string;
  glyph: GlyphProbe;
  reports: readonly ReadonlyArray<PlatformFont>[];
}>;

type GlyphFaceExpectation = Readonly<{
  fonts: readonly PlatformFont[];
  expectedFamily: string;
  character: string;
  role: string;
  state: string;
}>;

export async function collectSpanishGlyphAttributions(page: Page): Promise<GlyphAttribution[]> {
  const selector = "[data-spanish-glyph]";
  const [glyphs, reports] = await Promise.all([
    readGlyphLabels({ page, selector }),
    readRenderedFontsForNodes(page, selector),
  ]);
  const results: GlyphAttribution[] = [];
  for (const profile of proportionalFontFixtureProfiles) {
    for (const state of profile.states) {
      results.push(...collectStateAttributions({ profile, state, glyphs, reports }));
    }
  }
  return results;
}

function collectStateAttributions(
  { profile, state, glyphs, reports }: GlyphAttributionContext,
): GlyphAttribution[] {
  const stateKey = `${state.weight}-${state.style}`;
  const matchingGlyphs = glyphs.filter((glyph) =>
    glyph.role === profile.role && glyph.state === stateKey
  );
  expect(matchingGlyphs.map(({ character }) => character))
    .toEqual(proportionalFontContract.spanishCoverage);
  return matchingGlyphs.map((glyph) =>
    attributeGlyph({ profile, state: stateKey, glyph, reports })
  );
}

function attributeGlyph(
  { profile, state, glyph, reports }: GlyphAttributionInput,
): GlyphAttribution {
  const fonts = reports[glyph.glyphIndex] ?? [];
  assertExpectedFace({
    fonts,
    expectedFamily: profile.familyName,
    character: glyph.character,
    role: profile.role,
    state,
  });
  expect(glyph.computedFamily, `${profile.role}/${state}/${glyph.character}/computed family`)
    .toContain(profile.familyName);
  return { ...glyph, fonts };
}

const readGlyphLabels = async (
  { page, selector }: { page: Page; selector: string },
): Promise<GlyphProbe[]> =>
  page.locator(selector).evaluateAll((elements) =>
    elements.map((element, glyphIndex) => ({
      character: element.getAttribute("data-character") ?? "",
      computedFamily: getComputedStyle(element).fontFamily,
      glyphIndex,
      role: element.closest<HTMLElement>("[data-typography-role]")?.dataset.typographyRole ?? "",
      state: element.closest<HTMLElement>("[data-typography-state]")?.dataset.typographyState ?? "",
    }))
  );

function assertExpectedFace(
  { fonts, expectedFamily, character, role, state }: GlyphFaceExpectation,
): void {
  const identity = `${role}/${state}/${JSON.stringify(character)}`;
  expect(fonts.reduce((count, font) => count + font.glyphCount, 0), `${identity}/glyph count`)
    .toBe(1);
  const expectedFace = fonts.find((font) => font.familyName.includes(expectedFamily));
  expect(expectedFace, `${identity}/face`).toBeDefined();
  expect(expectedFace?.isCustomFont, `${identity}/custom font`).toBe(true);
  expect(fonts.filter((font) => font.glyphCount > 0).map(({ familyName }) => familyName), identity)
    .toEqual([expect.stringContaining(expectedFamily)]);
}
