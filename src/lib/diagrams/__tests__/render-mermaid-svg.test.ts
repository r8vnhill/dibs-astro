import fc from "fast-check";
import { expect, suite, test } from "vitest";
import { renderDiagramSvg } from "../render-mermaid-svg";
import type { DiagramSpec } from "../types";

const simpleDiagram: DiagramSpec = {
    id: "simple-flow",
    title: "Flujo simple",
    description: "Un valor pasa de una etapa a otra.",
    source: "flowchart LR\n    input[Entrada] --> output[Salida]",
};

suite("given a Mermaid diagram specification", () => {
    test("then rendering the same specification twice is byte-identical", () => {
        expect(renderDiagramSvg(simpleDiagram)).toBe(renderDiagramSvg(simpleDiagram));
    });

    test("then it produces one responsive SVG root", () => {
        const svg = renderDiagramSvg(simpleDiagram);

        expect((svg.match(/<svg\b/g) ?? []).length).toBe(1);
        expect(svg).toContain("viewBox=");
    });

    test("then invalid source reports the diagram identity", () => {
        expect(() => renderDiagramSvg({ ...simpleDiagram, id: "broken-flow", source: "not a diagram" })).toThrow(
            /broken-flow.*Flujo simple/,
        );
    });

    test("then simple generated flowcharts remain deterministic", () => {
        fc.assert(
            fc.property(fc.integer({ min: 0, max: 999 }), (suffix) => {
                const spec = {
                    ...simpleDiagram,
                    id: `generated-flow-${suffix}`,
                    source: `flowchart LR\n    start[Start ${suffix}] --> finish[Finish ${suffix}]`,
                };

                expect(renderDiagramSvg(spec)).toBe(renderDiagramSvg(spec));
            }),
        );
    });
});
