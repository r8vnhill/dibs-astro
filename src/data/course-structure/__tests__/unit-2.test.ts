import { describe, expect, test } from "vitest";
import { unit2Lessons } from "../unit-2";

describe("unit2Lessons", () => {
    test("starts Unit 2 with reusable support scripts", () => {
        expect(unit2Lessons[0]).toMatchObject({
            kind: "link",
            id: "support-scripts",
            title: "Scripts de apoyo como software reusable",
            href: "/notes/scripting/support-scripts/",
        });
    });
});
