import { JSDOM } from "jsdom";
import { describe, expect, test } from "vitest";
import { createAstroRenderer } from "../../../../test-utils/astro-render";
import DibsSourceLink from "../DibsSourceLink.astro";

type DibsSourceLinkProps = {
    repo: string;
    file: string;
    title?: string;
    ref?: string;
    line?: number;
    endLine?: number;
    ariaLabel?: string;
    projectPath?: string;
};

async function renderLink(
    props: DibsSourceLinkProps,
    slots?: Record<string, string>,
): Promise<HTMLAnchorElement> {
    const render = await createAstroRenderer<DibsSourceLinkProps>(DibsSourceLink);
    const html = await render(props, slots ? { slots } : undefined);
    const document = new JSDOM(html).window.document;
    const anchors = [...document.querySelectorAll("a")];

    expect(anchors).toHaveLength(1);

    return anchors[0] as HTMLAnchorElement;
}

describe("DibsSourceLink.astro render", () => {
    test("renders legacy repository links through the fallback namespace", async () => {
        const anchor = await renderLink({
            repo: "scripts",
            file: "scripts/check.main.kts",
        });

        expect(anchor.href).toBe("https://gitlab.com/r8vnhill/dibs-scripts/-/blob/main/scripts/check.main.kts");
    });

    test("renders migrated repository links through the migration registry", async () => {
        const anchor = await renderLink({
            repo: "kotlin-companion",
            file: "scripts/check-library-layout.main.kts",
        });

        expect(anchor.href).toBe(
            "https://gitlab.com/dibs-course/kotlin-companion/-/blob/main/scripts/check-library-layout.main.kts",
        );
    });

    test("prefers projectPath overrides over the registry", async () => {
        const anchor = await renderLink({
            repo: "kotlin-companion",
            projectPath: "custom/group",
            file: "scripts/check-library-layout.main.kts",
        });

        expect(anchor.href).toBe(
            "https://gitlab.com/custom/group/-/blob/main/scripts/check-library-layout.main.kts",
        );
    });

    test("preserves external-link and accessibility attributes", async () => {
        const anchor = await renderLink({
            repo: "scripts",
            file: "scripts/check.main.kts",
        });

        expect(anchor.target).toBe("_blank");
        expect(anchor.rel).toBe("noopener noreferrer");
        expect(anchor.getAttribute("data-has-ref")).toBe("false");
        expect(anchor.getAttribute("aria-label")).toBe("Fuente (main)");
        expect(anchor.textContent?.trim()).toBe("scripts/scripts/check.main.kts");
    });

    test("renders custom slot content and explicit ref hints", async () => {
        const anchor = await renderLink(
            {
                repo: "scripts",
                file: "scripts/check.main.kts",
                ref: "6b3cbfeaf6820f1234567890abcdef1234567890",
                line: 10,
                endLine: 20,
            },
            { default: "Ver fuente" },
        );

        expect(anchor.href).toBe(
            "https://gitlab.com/r8vnhill/dibs-scripts/-/blob/6b3cbfeaf6820f1234567890abcdef1234567890/scripts/check.main.kts#L10-20",
        );
        expect(anchor.getAttribute("data-has-ref")).toBe("true");
        expect(anchor.getAttribute("aria-label")).toBe(
            "Fuente (6b3cbfeaf6820f1234567890abcdef1234567890, líneas 10-20)",
        );
        expect(anchor.textContent).toContain("Ver fuente");
        expect(anchor.textContent).toContain("6b3cbfe");
    });

    test("uses ariaLabel overrides when provided", async () => {
        const anchor = await renderLink({
            repo: "scripts",
            file: "scripts/check.main.kts",
            ariaLabel: "Fuente del script de comprobación",
        });

        expect(anchor.getAttribute("aria-label")).toBe("Fuente del script de comprobación");
    });
});
