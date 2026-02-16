import { describe, expect, it } from "vitest";
import { parseBibliography, resolveReferenceGroups } from "../normalize-jsonld";

describe("resolveReferenceGroups", () => {
    const parsed = parseBibliography({
        "@context": "https://schema.org",
        "@type": "ItemList",
        itemListElement: [
            {
                "@type": "Book",
                identifier: "book-1",
                name: "The pipeline, deeper",
                isPartOf: {
                    "@type": "Book",
                    name: "Learn PowerShell in a month of lunches",
                },
            },
            {
                "@type": "WebPage",
                identifier: "web-1",
                name: "Collection Pipeline",
                url: "https://martinfowler.com/articles/collection-pipeline/",
            },
        ],
    });

    it("throws if a group references an unknown id", () => {
        expect(() => resolveReferenceGroups(parsed, ["missing-id"], [])).toThrow(
            /unknown reference ids/i,
        );
    });

    it("throws on duplicated ids across groups in strict mode", () => {
        expect(() => resolveReferenceGroups(parsed, ["book-1"], ["book-1"])).toThrow(
            /duplicate ids across reference groups/i,
        );
    });

    it("resolves groups and does not require description fields", () => {
        const grouped = resolveReferenceGroups(parsed, ["book-1"], ["web-1"]);
        expect(grouped.recommended).toHaveLength(1);
        expect(grouped.additional).toHaveLength(1);
        expect(grouped.recommended.at(0)?.description).toBeUndefined();
    });
});
