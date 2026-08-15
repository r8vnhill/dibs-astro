import { expect, suite, test } from "vitest";
import { resolvePlaywrightTarget } from "./playwright-target";

suite("given a Playwright target configuration", () => {
    test.each(
        [
            [undefined, false, "http://127.0.0.1:4321", true],
            [undefined, true, "http://127.0.0.1:4321", true],
            ["http://dibs:8080", true, "http://dibs:8080", false],
        ] as const,
    )("then resolves %s to %s with local server: %s", (externalBaseUrl, _isCi, baseURL, hasWebServer) => {
        const target = resolvePlaywrightTarget(externalBaseUrl, _isCi);

        expect(target.baseURL).toBe(baseURL);
        expect(Boolean(target.webServer)).toBe(hasWebServer);
    });
});
