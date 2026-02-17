// @vitest-environment node

import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { beforeEach, describe, expect, test } from "vitest";
import LessonMetaPanel from "../LessonMetaPanel.astro";

let container: Awaited<ReturnType<typeof AstroContainer.create>>;

async function renderPanel(props: Record<string, unknown>): Promise<string> {
    return container.renderToString(LessonMetaPanel, { props });
}

describe.concurrent("LessonMetaPanel.astro render", () => {
    beforeEach(async () => {
        container = await AstroContainer.create();
    });

    test("shows missing-date label and no-changes message when metadata has no commits", async () => {
        const html = await renderPanel({
            metadata: {
                sourceFile: "src/pages/notes/example/index.astro",
                authors: [{ name: "Proyecto DIBS" }],
                changes: [],
            },
        });

        expect(html).toContain("Metadatos de la lección");
        expect(html).toContain("Última actualización:");
        expect(html).toContain("sin fecha registrada");
        expect(html).toContain("No hay cambios registrados.");
    });
});
