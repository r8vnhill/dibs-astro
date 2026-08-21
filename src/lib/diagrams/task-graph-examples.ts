import type { DiagramSpec } from "~/lib/diagrams/types";

export const taskDependencyGraph: DiagramSpec = {
    id: "task-dependency-graph",
    title: "El grafo de dependencias del reporte",
    description:
        "prepareCatalog habilita generateReport, y generateReport habilita tanto packageReport como verifyReport.",
    source: `flowchart LR
        prepareCatalog --> generateReport
        generateReport --> packageReport
        generateReport --> verifyReport`,
};

export const cyclicDependencyCounterexample: DiagramSpec = {
    id: "cyclic-dependency-counterexample",
    title: "Ciclo dirigido en el grafo de dependencias",
    description:
        "prepareCatalog precede a generateReport, generateReport precede a packageReport y packageReport precede a prepareCatalog: siguiendo las flechas se regresa a prepareCatalog.",
    source: `flowchart LR
        prepareCatalog --> generateReport
        generateReport --> packageReport
        packageReport --> prepareCatalog`,
};

export const packageReportSelectedGraph: DiagramSpec = {
    id: "package-report-selected-graph",
    title: "Grafo de tareas seleccionado para packageReport",
    description:
        "Solicitar packageReport selecciona solo prepareCatalog y generateReport como dependencias necesarias; verifyReport queda fuera de esta ejecución.",
    source: `flowchart LR
        prepareCatalog --> generateReport --> packageReport`,
};

export const verifyReportSelectedGraph: DiagramSpec = {
    id: "verify-report-selected-graph",
    title: "Grafo de tareas seleccionado para verifyReport",
    description:
        "Solicitar verifyReport selecciona prepareCatalog y generateReport como dependencias necesarias; packageReport queda fuera de esta ejecución.",
    source: `flowchart LR
        prepareCatalog --> generateReport --> verifyReport`,
};

export const taskGraphDiagramSpecs = [
    taskDependencyGraph,
    cyclicDependencyCounterexample,
    packageReportSelectedGraph,
    verifyReportSelectedGraph,
] as const;
