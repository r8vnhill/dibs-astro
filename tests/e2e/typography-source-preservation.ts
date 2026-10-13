/**
 * Check that shaping leaves the source characters available to selection and copying.
 *
 * Selection uses a DOM Range; Chromium copying uses the keyboard and browser clipboard. Students
 * can compare the visible ligature with the unchanged characters returned by these browser APIs.
 */
import { expect, type Locator, type Page } from "@playwright/test";
import { proportionalFontContract } from "../../src/lib/typography/proportional-font-contract";
import {
  proportionalFontFeatureModes,
  proportionalFontFixtureProfiles,
  typographyStateKey,
} from "../../src/lib/typography/proportional-font-fixture";

const representativeIds = new Set([
  "common-fi",
  "common-ffi",
  "technical-arrow-right",
  "technical-implies",
  "technical-not-equal",
]);

const representativeLigatures = proportionalFontContract.ligatures.filter(({ id }) =>
  representativeIds.has(id)
);

const specimen = (
  page: Page,
  profile: (typeof proportionalFontFixtureProfiles)[number],
  state: (typeof profile.states)[number],
  ligatureId: string,
  mode: (typeof proportionalFontFeatureModes)[number]["id"],
): Locator =>
  page.locator(
    `[data-typography-role="${profile.role}"]`
      + `[data-font-family="${profile.familyId}"]`
      + `[data-typography-state="${typographyStateKey(state)}"]`
      + `[data-ligature-id="${ligatureId}"]`
      + `[data-feature-mode="${mode}"]`,
  );

const selectSource = async (sample: Locator): Promise<string> =>
  sample.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    return selection?.toString() ?? "";
  });

export async function assertRepresentativeSelectionText(page: Page): Promise<number> {
  let cases = 0;
  for (const profile of proportionalFontFixtureProfiles) {
    for (const state of profile.states) {
      for (const ligature of representativeLigatures) {
        for (const mode of proportionalFontFeatureModes) {
          await assertSelection(page, profile, state, ligature, mode.id);
          cases += 1;
        }
      }
    }
  }
  return cases;
}

async function assertSelection(
  page: Page,
  profile: (typeof proportionalFontFixtureProfiles)[number],
  state: (typeof profile.states)[number],
  ligature: (typeof representativeLigatures)[number],
  mode: (typeof proportionalFontFeatureModes)[number]["id"],
): Promise<void> {
  const sample = specimen(page, profile, state, ligature.id, mode);
  const identity = `${profile.familyName}/${typographyStateKey(state)}/${ligature.id}/${mode}`;

  await expect(sample, identity).toHaveCount(1);
  expect(await selectSource(sample), identity).toBe(ligature.source);
}

export async function assertChromiumClipboardText(page: Page): Promise<number> {
  let cases = 0;
  for (const profile of proportionalFontFixtureProfiles) {
    const state = profile.states[0];
    if (!state) throw new Error(`No typography state is configured for ${profile.familyName}.`);
    for (const ligature of representativeLigatures) {
      for (const mode of proportionalFontFeatureModes) {
        await assertClipboardCase(page, profile, state, ligature, mode.id);
        cases += 1;
      }
    }
  }
  return cases;
}

async function assertClipboardCase(
  page: Page,
  profile: (typeof proportionalFontFixtureProfiles)[number],
  state: (typeof profile.states)[number],
  ligature: (typeof representativeLigatures)[number],
  mode: (typeof proportionalFontFeatureModes)[number]["id"],
): Promise<void> {
  const sample = specimen(page, profile, state, ligature.id, mode);
  const identity = `${profile.familyName}/${typographyStateKey(state)}/${ligature.id}/${mode}`;

  await page.evaluate(() => navigator.clipboard.writeText(""));
  expect(await selectSource(sample), `${identity}/selection`).toBe(ligature.source);
  await page.keyboard.press("Control+C");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied, `${identity}/clipboard`).toBe(ligature.source);
}

export async function readFirefoxClipboardOutcome(page: Page): Promise<ClipboardOutcome> {
  const supported = await page.evaluate(() => Boolean(navigator.clipboard?.readText));
  if (!supported) return { status: "unsupported", detail: "Clipboard read API is unavailable." };

  await page.evaluate(() => navigator.clipboard.writeText("").catch(() => undefined));
  const profile = proportionalFontFixtureProfiles[0];
  const state = profile?.states[0];
  const ligature = representativeLigatures[0];
  if (!profile || !state || !ligature) {
    throw new Error("The canonical source-preservation examples are incomplete.");
  }
  const sample = specimen(page, profile, state, ligature.id, "enabled");
  await prepareClipboardRead(page, sample);
  return page.evaluate(readClipboardOutcome, ligature.source);
}

async function prepareClipboardRead(page: Page, sample: Locator): Promise<void> {
  await selectSource(sample);
  await page.keyboard.press("Control+C");
}

async function readClipboardOutcome(expected: string): Promise<ClipboardOutcome> {
  try {
    const actual = await navigator.clipboard.readText();
    return actual === expected
      ? { status: "verified", detail: "Copied text matches the selected source." }
      : { status: "failed", detail: `Clipboard returned ${JSON.stringify(actual)}.` };
  } catch (error) {
    return { status: "unsupported", detail: String(error) };
  }
}

export type ClipboardOutcome = Readonly<{
  status: "verified" | "unsupported" | "failed";
  detail: string;
}>;
