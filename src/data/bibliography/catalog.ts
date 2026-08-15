import { type BibliographyCatalog, loadBibliographyCatalog } from "~/lib/bibliography";
import bibliographyCatalogRaw from "./catalog.graph.generated.jsonld?raw";

const bibliographyCatalogJson = JSON.parse(bibliographyCatalogRaw) as Record<string, unknown>;

export const bibliographyCatalog: BibliographyCatalog = loadBibliographyCatalog(
    bibliographyCatalogJson,
    {
        strict: true,
        sourceLabel: "bibliographyCatalog",
    },
);

export default bibliographyCatalog;
