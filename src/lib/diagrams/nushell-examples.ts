import type { DiagramSpec } from "~/lib/diagrams/types";

export const unixAndNushellComposition: DiagramSpec = {
    id: "unix-and-nushell-composition",
    title: "La misma composición con representaciones distintas",
    description:
        "Unix conecta programas mediante bytes o texto; Nushell conecta comandos internos mediante valores estructurados.",
    source: `
        flowchart TB
            subgraph Unix
                direction LR
                unixProgramA[programa] -->|bytes o texto| unixProgramB[programa]
            end
            subgraph Nushell
                direction LR
                nuCommandA[comando] -->|valor estructurado| nuCommandB[comando]
            end
    `,
};

export const internalAndExternalBoundary: DiagramSpec = {
    id: "internal-and-external-boundary",
    title: "La frontera entre el pipeline interno y un proceso externo",
    description:
        "Dentro de Nushell circulan valores estructurados; al cruzar hacia un proceso externo se entrega una representación por stdin y stdout devuelve datos que solo recuperan estructura mediante una interpretación explícita.",
    source: `
        sequenceDiagram
            participant Interno as Nushell (interno)
            participant Externo as Proceso externo

            Note over Interno: comandos internos intercambian valores estructurados
            Interno->>Externo: stdin: representación
            Externo->>Interno: stdout: datos del proceso externo
            Note over Interno: interpretación explícita cuando el formato lo requiere
    `,
};

export const persistedRepresentationToRuntimeValue: DiagramSpec = {
    id: "persisted-representation-to-runtime-value",
    title: "De la representación persistida al valor de Nushell",
    description:
        "album.json es una representación almacenada; open atraviesa la frontera de decodificación y produce valores Nushell que luego pueden transformarse.",
    source: `sequenceDiagram
        participant Disco as album.json
        participant Runtime as Valores Nushell
        participant Pipeline as Transformaciones

        Disco->>Runtime: open (decodificación)
        Runtime->>Pipeline: get · where · select`,
};

export const runPipelineStageProgression: DiagramSpec = {
    id: "run-pipeline-stage-progression",
    title: "La progresión hacia run como etapa del pipeline",
    description:
        "El modelo progresa desde valores estructurados hacia contratos tipados, un script reusable y finalmente ese script como etapa de un pipeline.",
    source: `flowchart LR
        values[Valores estructurados] --> contracts[Contratos de pipeline tipados]
        contracts --> script[Script .nu reusable]
        script --> run[run como etapa del pipeline]`,
};

export const nushellDiagramSpecs = [
    unixAndNushellComposition,
    internalAndExternalBoundary,
    persistedRepresentationToRuntimeValue,
    runPipelineStageProgression,
] as const;
