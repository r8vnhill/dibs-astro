import { getLibraryWhatIsReadings, getPublishedReadings } from "$presentation/adapters/lesson-readings";
import { expect, suite, test } from "vitest";

suite("given the presentation lesson-readings adapter", () => {
    test("then it exposes the curated library lesson through the presentation boundary", () => {
        const readings = getLibraryWhatIsReadings();

        expect(readings.lessonPath).toBe("/notes/software-libraries/what-is/");
        expect(readings.essential.length).toBeGreaterThan(0);
    });

    test("then it exposes only published reading guides", () => {
        const readings = getPublishedReadings();

        expect(readings).toHaveLength(1);
        expect(readings[0].lessonPath).toBe("/notes/software-libraries/what-is/");
    });
});
