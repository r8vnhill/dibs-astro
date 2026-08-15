import {
    getLibraryWhatIsReadings,
    getPublishedReadings,
    getSupportScriptsNushellReadings,
} from "$presentation/adapters/lesson-readings";
import { expect, suite, test } from "vitest";

suite("given the presentation lesson-readings adapter", () => {
    test("then it exposes the curated library lesson through the presentation boundary", () => {
        const readings = getLibraryWhatIsReadings();

        expect(readings.lessonPath).toBe("/notes/software-libraries/what-is/");
        expect(readings.essential.length).toBeGreaterThan(0);
    });

    test("then it exposes the curated Nushell support-scripts lesson through the presentation boundary", () => {
        const readings = getSupportScriptsNushellReadings();

        expect(readings.lessonPath).toBe("/notes/scripting/support-scripts/nushell/");
        expect(readings.essential.length).toBeGreaterThan(0);
    });

    test("then it exposes only published reading guides", () => {
        const readings = getPublishedReadings();

        expect(readings).toHaveLength(2);
        expect(readings.map((reading) => reading.lessonPath)).toEqual([
            "/notes/software-libraries/what-is/",
            "/notes/scripting/support-scripts/nushell/",
        ]);
    });
});
