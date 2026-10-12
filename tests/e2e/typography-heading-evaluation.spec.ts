/**
 * Browser evidence for the DIBS Slab heading evaluation.
 *
 * The checks hold text, element semantics, and layout settings steady while recording font and
 * overflow measurements. Students can compare the resulting screenshots while leaving the visual
 * preference itself to human review.
 */

import { test } from "@playwright/test";
import {
  captureHeadingReview,
  reviewViewports,
  verifyHeadingFonts,
  verifyHeadingLayout,
  verifyHeadingParity,
} from "./typography-heading-evaluation/checks";

test.describe("typography heading evaluation", () => {
  test("loads every heading candidate and reference state locally", async ({ page }) => {
    await verifyHeadingFonts(page);
  });

  test("keeps paired heading specimens equivalent except for font family", async ({ page }) => {
    await verifyHeadingParity(page);
  });

  test(
    "keeps heading and TOC surfaces within their layout at both viewports",
    async ({ page }, testInfo) => verifyHeadingLayout(page, testInfo),
  );

  for (const viewport of reviewViewports) {
    test(`captures ${viewport.name} heading review evidence`, async ({ page }, testInfo) => {
      await captureHeadingReview(page, testInfo, viewport);
    });
  }
});
