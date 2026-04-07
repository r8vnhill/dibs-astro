import bibliographyCatalogRaw from "./catalog.graph.generated.jsonld?raw";
import { loadBibliographyCatalog, type BibliographyCatalog } from "~/lib/bibliography";

const bibliographyCatalogJson = JSON.parse(bibliographyCatalogRaw) as Record<string, unknown>;

export const bibliographyCatalog: BibliographyCatalog = loadBibliographyCatalog(
    bibliographyCatalogJson,
    {
        strict: true,
        sourceLabel: "bibliographyCatalog",
    },
);

export default bibliographyCatalog;
