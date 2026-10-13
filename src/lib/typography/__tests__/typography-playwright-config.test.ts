import { expect, suite, test } from "vitest";
import generalConfig from "../../../../playwright.config";
import { typographyPlaywrightConfig } from "../../../../playwright.typography.config";
import { resolvePlaywrightTarget } from "../../../../tests/e2e/playwright-target";

suite("given the dedicated typography projects", () => {
  test("then it defines only Chromium and Firefox projects", () => {
    expect(typographyPlaywrightConfig.projects?.map(({ name }) => name)).toEqual([
      "chromium",
      "firefox",
    ]);
  });

  test("then it discovers typography specs from the E2E directory only", () => {
    expect(typographyPlaywrightConfig.testDir).toBe("tests/e2e");
    expect(typographyPlaywrightConfig.testMatch).toBe("**/typography-*.spec.ts");
    expect(typographyPlaywrightConfig.testIgnore).toBeUndefined();
  });
});

suite("given the dedicated typography run settings", () => {
  test("then both harnesses keep the shared browser target behavior", () => {
    const target = resolvePlaywrightTarget(
      process.env.CONTAINER_BASE_URL,
      Boolean(process.env.CI),
    );

    expect(typographyPlaywrightConfig.use?.baseURL).toBe(target.baseURL);
    expect(typographyPlaywrightConfig.webServer).toEqual(target.webServer);
    expect(generalConfig.projects?.map(({ name }) => name)).toEqual(["chromium"]);
    expect(generalConfig.testDir).toBe("tests/e2e");
  });

  test("then it separates browser artifacts from the general suite", () => {
    expect(typographyPlaywrightConfig.outputDir).toBe("test-results-typography");
    expect(typographyPlaywrightConfig.outputDir).not.toBe(generalConfig.outputDir);
  });
});
