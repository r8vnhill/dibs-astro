import type { DiagramSpec } from "../types";

export const canonicalDiagramSpecs = [
    {
        id: "comparison-cards",
        title: "Dos formas de composición",
        description: "Dos tarjetas agrupan caminos equivalentes con representaciones diferentes.",
        source: `flowchart TB
            subgraph Unix[Unix]
                direction LR
                unixInput[Programa] -->|bytes o texto| unixOutput[Programa]
            end
            subgraph Nushell[Nushell]
                direction LR
                nuInput[Comando] -->|valor estructurado| nuOutput[Comando]
            end`,
    },
    {
        id: "linear-left-to-right",
        title: "Flujo horizontal",
        description: "Una entrada atraviesa dos transformaciones hasta producir una salida.",
        source: "flowchart LR\n    input[Entrada] --> normalize[Normalizar] --> output[Salida]",
    },
    {
        id: "linear-top-to-bottom",
        title: "Flujo vertical",
        description: "Una entrada se transforma en etapas sucesivas de arriba abajo.",
        source: "flowchart TB\n    source[Fuente] --> parse[Parsear] --> value[Valor]",
    },
    {
        id: "branching-flow",
        title: "Flujo con decisión",
        description: "Una decisión dirige el valor hacia una de dos salidas.",
        source: `flowchart TB
            input[Entrada] --> decision{¿Válida?}
            decision -->|sí| accepted[Aceptar]
            decision -->|no| rejected[Rechazar]`,
    },
    {
        id: "nested-groups",
        title: "Etapas agrupadas",
        description: "Un grupo interno forma parte de una etapa mayor del proceso.",
        source: `flowchart TB
            subgraph Pipeline[Pipeline]
                subgraph Validation[Validación]
                    read[Leer] --> check[Comprobar]
                end
                check --> emit[Emitir]
            end`,
    },
    {
        id: "edge-labels",
        title: "Relaciones etiquetadas",
        description: "Las etiquetas explican qué representación circula entre nodos.",
        source: "flowchart LR\n    record[Registro] -->|JSON| text[Texto] -->|parseo| value[Valor]",
    },
    {
        id: "long-spanish-labels",
        title: "Etiquetas extensas",
        description: "Las etiquetas largas mantienen su significado conceptual en español.",
        source: `flowchart LR
            source[Representación persistida de una colección] -->|decodificación explícita| runtime[Valores estructurados disponibles para el pipeline]`,
    },
    {
        id: "internal-external-boundary",
        title: "Frontera interna y externa",
        description: "El proceso externo recibe texto y el pipeline interno recupera un valor estructurado.",
        source: `flowchart LR
            subgraph Internal[Pipeline interno]
                value[Valor estructurado]
            end
            value -->|serialización| process[Proceso externo]
            process -->|stdout: bytes o texto| parse[Parseo explícito]
            parse --> result[Valor estructurado]`,
    },
] as const satisfies readonly DiagramSpec[];
