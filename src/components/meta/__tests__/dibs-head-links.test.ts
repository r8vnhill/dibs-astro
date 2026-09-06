import { describe, expect, test } from "vitest";
import { buildDibsHeadLinks, type DibsHeadLinkOptions } from "../dibs-head-links";

/**
 * Pure characterization of the DIBS resource-selection policy.
 *
 * The helper owns *which* resources DIBS renders and *in what order*; rendering
 * belongs to `@ravenhill/astro-head`. These cases exercise the mapping with
 * distinctive fixture URLs rather than the production favicon/font constants, so
 * `Head.evidence.render.test.ts` stays the single owner of the real DIBS values.
 */

const OPTIONS: DibsHeadLinkOptions = {
    faviconHref: "/kaleido-icon.png",
    baseFontStylesheet: "https://fonts.example.test/kaleido.css",
};

describe("given DIBS document-resource selection", () => {
    test("then it returns the icon, both Google Fonts preconnects, and the base stylesheet in order", () => {
        expect(buildDibsHeadLinks(OPTIONS)).toEqual([
            { rel: "icon", href: "/kaleido-icon.png", type: "image/png" },
            { rel: "preconnect", href: "https://fonts.googleapis.com" },
            { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
            { rel: "stylesheet", href: "https://fonts.example.test/kaleido.css" },
        ]);
    });

    test("then caller-supplied URLs propagate unchanged", () => {
        const links = buildDibsHeadLinks({
            faviconHref: "https://cdn.example.test/sora.ico",
            baseFontStylesheet: "https://fonts.example.test/layla.css",
        });

        expect(links[0]?.href).toBe("https://cdn.example.test/sora.ico");
        expect(links[3]?.href).toBe("https://fonts.example.test/layla.css");
    });

    test("then only the static font origin carries crossOrigin", () => {
        const preconnects = buildDibsHeadLinks(OPTIONS).filter((link) => link.rel === "preconnect");

        expect(preconnects.map((link) => link.href)).toEqual([
            "https://fonts.googleapis.com",
            "https://fonts.gstatic.com",
        ]);
        expect(preconnects.map((link) => ("crossOrigin" in link ? link.crossOrigin : undefined)))
            .toEqual([undefined, "anonymous"]);
    });

    test.each([
        ["sitemap", "/sitemap-index.xml"],
        ["the optional 404 font", "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"],
    ])("then it excludes %s (application-local markup)", (_label, href) => {
        expect(buildDibsHeadLinks(OPTIONS).map((link) => link.href)).not.toContain(href);
    });

    test("then the relation sequence is owned by DIBS", () => {
        expect(buildDibsHeadLinks(OPTIONS).map((link) => link.rel)).toEqual([
            "icon",
            "preconnect",
            "preconnect",
            "stylesheet",
        ]);
    });
});
