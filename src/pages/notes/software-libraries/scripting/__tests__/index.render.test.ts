import { describe, expect, test } from "vitest";
import { createAstroRenderer } from "../../../../../test-utils/astro-render";
import ScriptingPage from "../index.astro";
import NodePage from "../node.astro";

describe.concurrent("Scripting lesson render", () => {
    test("renders Node.js alongside the existing comparative entries", async () => {
        const renderPage = await createAstroRenderer<Record<string, never>>(ScriptingPage);

        const html = await renderPage(
            {},
            {
                request: new Request(
                    "https://dibs.ravenhill.cl/notes/software-libraries/scripting/",
                ),
            },
        );

        expect(html).toContain("Node.js");
        expect(html).toContain("/notes/software-libraries/scripting/node/");
        expect(html).toContain("Python");
        expect(html).toContain("Nushell");
    });

    test("renders the Node.js comparative lesson with its PowerShell framing", async () => {
        const renderPage = await createAstroRenderer<Record<string, never>>(NodePage);

        const html = await renderPage(
            {},
            {
                request: new Request(
                    "https://dibs.ravenhill.cl/notes/software-libraries/scripting/node/",
                ),
            },
        );

        expect(html).toContain("Introducción a scripting con Node.js");
        expect(html).toContain("Introducción a PowerShell");
        expect(html).toContain("Node.js como herramienta de scripting");
        expect(html).toContain("Node.js vs PowerShell");
    });
});
