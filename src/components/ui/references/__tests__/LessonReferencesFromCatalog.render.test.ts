import fs from "node:fs";
import { beforeEach, describe, expect, test } from "vitest";
import { type AstroRender, createAstroRenderer } from "../../../../test-utils/astro-render";
import LessonReferencesFromCatalog from "../LessonReferencesFromCatalog.astro";

type LessonReferencesFromCatalogProps = {
    lessonId?: string;
};

let renderReferences: AstroRender<LessonReferencesFromCatalogProps>;

describe.concurrent("LessonReferencesFromCatalog.astro render", () => {
    beforeEach(async () => {
        renderReferences = await createAstroRenderer<LessonReferencesFromCatalogProps>(
            LessonReferencesFromCatalog,
        );
    });

    test("renders references from the shared catalog with explicit lessonId", async () => {
        const html = await renderReferences({
            lessonId: "/notes/scripting/pipelines/nushell/",
        });

        expect(html).toContain("Pipelines");
        expect(html).toContain("nushell.sh/book/pipelines.html");
    });

    test("resolves lessonId from Astro.url.pathname", async () => {
        const html = await renderReferences(
            {},
            {
                request: new Request(
                    "https://dibs.ravenhill.cl/notes/scripting/pipelines/nushell/",
                ),
            },
        );

        expect(html).toContain("Pipelines");
        expect(html).toContain("nushell.sh/book/pipelines.html");
    });

    test("keeps pending-revision hidden by default", async () => {
        const generatedCatalog = JSON.parse(
            fs.readFileSync("src/data/bibliography/catalog.graph.generated.jsonld", "utf8"),
        );

        expect(JSON.stringify(generatedCatalog)).toContain("pending-revision");

        const html = await renderReferences({
            lessonId: "/notes/scripting/node/",
        });

        expect(html).not.toContain("About npm | npm Docs");
        expect(html).not.toContain("Introduction to Node.js");
    });
});
