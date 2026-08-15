import { renderMermaidSVG } from "beautiful-mermaid";
import type { DiagramSpec } from "./types";

const rendererOptions = {
    bg: "var(--background)",
    fg: "var(--foreground)",
    line: "var(--muted-foreground)",
    accent: "var(--primary)",
    muted: "var(--muted-foreground)",
    surface: "var(--card)",
    border: "var(--border)",
    font: "inherit",
    padding: 28,
    nodeSpacing: 28,
    layerSpacing: 40,
    componentSpacing: 48,
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
