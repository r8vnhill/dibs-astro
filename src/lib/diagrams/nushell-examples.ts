import type { DiagramSpec } from "~/lib/diagrams/types";

export const unixAndNushellComposition: DiagramSpec = {
    id: "unix-and-nushell-composition",
    title: "La misma composición con representaciones distintas",
    description: "Unix conecta programas mediante bytes o texto; Nushell conecta comandos internos mediante valores estructurados.",
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

export const unixAndNushellCompositionAlt: DiagramSpec = {
    id: "unix-and-nushell-composition-alt",
    title: "La misma composición con representaciones distintas (alternativa)",
    description: "Unix conecta programas mediante bytes o texto; Nushell conecta comandos internos mediante valores estructurados.",
    source: `flowchart TB
        unixProgramA[Unix: programa] -->|stdin / stdout: bytes o texto| unixProgramB[programa]
        nuCommandA[Nushell: comando] -->|valor estructurado| nuCommandB[comando]
        unixProgramA -->|stdin / stdout: bytes o texto| nuCommandA
        nuCommandB -->|valor estructurado| unixProgramB`,
};

export const internalAndExternalBoundary: DiagramSpec = {
    id: "internal-and-external-boundary",
    title: "La frontera entre el pipeline interno y un proceso externo",
    description: "Dentro de Nushell circulan valores estructurados; al cruzar hacia un proceso externo hay conversión a bytes o texto y parseo explícito al regresar.",
    source: `flowchart TB
        valueA[Interno: valor Nushell] -->|valor| internalCommandA[Comando interno]
        internalCommandA -->|valor| valueB[Valor Nushell]
        valueB -->|valor| internalCommandB[Comando interno]
        internalCommandB --> valueC[Valor Nushell]
        valueD[Externo: valor Nushell] -->|conversión| process[Proceso externo]
        process -->|stdin / stdout: bytes o texto| parsed[Parseo]
        parsed -->|valor| valueE[Valor Nushell]`,
};

export const persistedRepresentationToRuntimeValue: DiagramSpec = {
    id: "persisted-representation-to-runtime-value",
    title: "De la representación persistida al valor de Nushell",
    description: "album.json es una representación almacenada; open atraviesa la frontera de decodificación y produce valores Nushell que luego pueden transformarse.",
    source: `flowchart LR
        stored[album.json] -->|open / decodificación| runtime[Valores Nushell]
        runtime -->|get · where · select| transformed[Transformaciones]`,
};

export const runPipelineStageProgression: DiagramSpec = {
    id: "run-pipeline-stage-progression",
    title: "La progresión hacia run como etapa del pipeline",
    description: "El modelo progresa desde valores estructurados hacia contratos tipados, un script reusable y finalmente ese script como etapa de un pipeline.",
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
