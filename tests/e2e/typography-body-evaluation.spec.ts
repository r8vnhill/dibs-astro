/**
 * Browser checks for the DIBS Sans body/UI evaluation.
 *
 * The suite confirms local font loading, paired layout settings, and review captures. The separate
 * ligature fixture isolates feature behavior so this comparison can focus on text and UI surfaces.
 */

import { test } from "@playwright/test";
import {
  captureBodyReview,
  verifyBodyFonts,
  verifyBodyParity,
} from "./typography-body-evaluation/checks";

const reviewViewports = [
  { name: "desktop", width: 1600, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;

test.describe("typography body/UI evaluation", () => {
  test("loads every candidate and reference state locally", async ({ page }) => {
    await verifyBodyFonts(page);
  });

  test(
    "keeps paired states identical except for font family and prevents overflow",
    async ({ page }) => verifyBodyParity(page),
  );

  for (const viewport of reviewViewports) {
    test(`captures the ${viewport.name} body/UI review evidence`, async ({ page }, testInfo) => {
      await captureBodyReview(page, testInfo, viewport);
    });
  }
});
