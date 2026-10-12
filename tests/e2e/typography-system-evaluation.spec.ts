/**
 * Checks font delivery and captures browser evidence for the three-role typography specimen.
 *
 * The automated checks establish that the intended faces rendered and the layout fits. Students
 * can use the desktop and mobile captures to compare reading, hierarchy, and code legibility;
 * maintainers can inspect the attached JSON for the measurements behind each capture.
 */

// cspell:words requestfailed grotesk gstatic firacode

import { test } from "@playwright/test";
import { runTypographySystemEvaluation } from "./typography-system-evaluation/run";

test.describe("three-role typography system evaluation", () => {
  test(
    "loads approved font sources and captures the combined fragment at each review viewport",
    async ({ page, browser }, testInfo) => runTypographySystemEvaluation(page, browser, testInfo),
  );
});
