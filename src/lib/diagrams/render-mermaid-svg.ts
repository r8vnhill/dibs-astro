import { renderMermaidSVG } from "beautiful-mermaid";
import type { DiagramSpec } from "./types";

/**
 * DIBS semantic roles are resolved by MermaidDiagram's wrapper rather than by
 * the renderer or by individual lessons. This keeps the SVG contract stable
 * while allowing graphical contrast to evolve independently from prose.
 */
const diagramColorOptions = {
    bg: "var(--diagram-background)",
    fg: "var(--diagram-foreground)",
    line: "var(--diagram-line)",
    accent: "var(--diagram-accent)",
    muted: "var(--diagram-muted)",
    surface: "var(--diagram-surface)",
    border: "var(--diagram-border)",
} as const;

const diagramLayoutOptions = {
    padding: 20,
    nodeSpacing: 32,
    layerSpacing: 48,
    componentSpacing: 32,
} as const;

const rendererOptions = {
    ...diagramColorOptions,
    font: "inherit",
    ...diagramLayoutOptions,
    transparent: true,
} as const;

export function renderDiagramSvg(spec: DiagramSpec): string {
    try {
        return renderMermaidSVG(spec.source, rendererOptions);
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`Could not render diagram "${spec.id}" (${spec.title}): ${reason}`, { cause: error });
    }
}
