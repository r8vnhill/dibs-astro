import type { LessonMetaPanelMetadata } from "$presentation/adapters/lesson-metadata-panel";
import * as publishedSiteCore from "@ravenhill/site-core";
import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, suite, test } from "vitest";
import type { PartialRecord } from "~/types/records";
import * as workspaceSiteCore from "../../../../packages/site-core/src/index";
import { type AstroRender, createAstroRenderer } from "../../../test-utils/astro-render";
import RepoLink from "../../git/RepoLink.astro";
import LessonMetaPanel from "../LessonMetaPanel.astro";
import LessonRepoPanel from "../LessonRepoPanel.astro";

type SiteCoreRuntime = Pick<
    typeof publishedSiteCore,
    "buildCommitUrl" | "buildRepoLinkText" | "buildRepoUrl" | "normalizePlatforms"
>;

type RepoLinkProps = {
    user: string;
    repo: string;
    platform: "github" | "gitlab";
    label?: string;
    showPlatform?: boolean;
    path?: string;
};

type LessonRepoPanelProps = {
    git: { user: string; repo: string };
    platforms?: unknown;
};

type LessonMetaPanelProps = {
    metadata: LessonMetaPanelMetadata;
    websiteRepoRefs?: PartialRecord<"github" | "gitlab", { user: string; repo: string }>;
    platforms?: unknown;
};

const workspaceRuntime: SiteCoreRuntime = workspaceSiteCore;
const publishedRuntime: SiteCoreRuntime = publishedSiteCore;
const repository = { user: "r8vnhill", repo: "dibs-scripts" };

const parseHtml = (html: string): Document => new JSDOM(html).window.document;

const projectLink = (link: Element) => ({
    href: link.getAttribute("href"),
    text: link.textContent?.trim(),
    ariaLabel: link.getAttribute("aria-label"),
});

const projectLinks = (doc: Document) =>
    [...doc.querySelectorAll("a")].map((link) => ({
        href: link.getAttribute("href"),
        text: link.textContent?.trim(),
    }));

const createMetadata = (): LessonMetaPanelMetadata => ({
    authors: [{ name: "Proyecto DIBS" }],
    changes: [{
        hash: "abc1234fff000",
        date: "2026-02-16",
        author: "A",
        subject: "Add metadata links",
    }],
});

const expectedRepoLink = (runtime: SiteCoreRuntime, props: RepoLinkProps) => ({
    href: runtime.buildRepoUrl(
        props,
        props.platform,
        props.path === undefined ? undefined : { path: props.path },
    ),
    text: runtime.buildRepoLinkText(props, props.platform, {
        ...(props.label === undefined ? {} : { label: props.label }),
        ...(props.showPlatform === undefined ? {} : { showPlatform: props.showPlatform }),
    }),
    ariaLabel: `Open ${props.user}/${props.repo} on ${props.platform === "github" ? "GitHub" : "GitLab"}`,
});

const expectedLessonRepoLinks = (runtime: SiteCoreRuntime, props: LessonRepoPanelProps) =>
    runtime.normalizePlatforms(props.platforms).map((platform) => ({
        href: runtime.buildRepoUrl(props.git, platform),
        text: runtime.buildRepoLinkText(props.git, platform),
    }));

const expectedLessonMetaLinks = (runtime: SiteCoreRuntime, props: LessonMetaPanelProps) => {
    const refs = props.websiteRepoRefs ?? {};
    const hash = props.metadata.changes[0]?.hash ?? "";

    return runtime.normalizePlatforms(props.platforms).flatMap((platform) => {
        const ref = refs[platform];
        return ref
            ? [{
                href: runtime.buildCommitUrl(ref, platform, hash),
                text: platform === "github" ? "GitHub" : "GitLab",
            }]
            : [];
    });
};

suite("given workspace and published site-core implementations", () => {
    test.each([
        {
            name: "repository root URL",
            run: (runtime: SiteCoreRuntime) => runtime.buildRepoUrl(repository, "gitlab"),
        },
        {
            name: "repository path URL",
            run: (runtime: SiteCoreRuntime) => runtime.buildRepoUrl(repository, "github", { path: "/tree/main" }),
        },
        {
            name: "GitLab commit URL",
            run: (runtime: SiteCoreRuntime) => runtime.buildCommitUrl(repository, "gitlab", "abc1234"),
        },
        {
            name: "GitHub commit URL with a path",
            run: (runtime: SiteCoreRuntime) =>
                runtime.buildCommitUrl(repository, "github", "abc1234", { path: "blob/main" }),
        },
        {
            name: "platform-aware repository text",
            run: (runtime: SiteCoreRuntime) => runtime.buildRepoLinkText(repository, "github", { showPlatform: true }),
        },
        {
            name: "default platform normalization",
            run: (runtime: SiteCoreRuntime) => runtime.normalizePlatforms(undefined),
        },
        {
            name: "filtered and deduplicated platform normalization",
            run: (runtime: SiteCoreRuntime) => runtime.normalizePlatforms(["github", "invalid", "github", "gitlab"]),
        },
    ])("then $name has the same result", ({ run }) => {
        expect(run(workspaceRuntime)).toEqual(run(publishedRuntime));
    });

    describe("when repository links are rendered", () => {
        let renderRepoLink: AstroRender<RepoLinkProps>;
        let renderRepoPanel: AstroRender<LessonRepoPanelProps>;
        let renderMetaPanel: AstroRender<LessonMetaPanelProps>;

        beforeEach(async () => {
            renderRepoLink = await createAstroRenderer<RepoLinkProps>(RepoLink);
            renderRepoPanel = await createAstroRenderer<LessonRepoPanelProps>(LessonRepoPanel);
            renderMetaPanel = await createAstroRenderer<LessonMetaPanelProps>(LessonMetaPanel);
        });

        test("then RepoLink preserves the published and workspace semantic projection", async () => {
            const props: RepoLinkProps = {
                ...repository,
                platform: "github",
                label: "source code",
                showPlatform: true,
                path: "tree/main",
            };
            const doc = parseHtml(await renderRepoLink(props));
            const link = doc.querySelector("a");

            expect(link).not.toBeNull();
            expect(projectLink(link!)).toEqual(expectedRepoLink(workspaceRuntime, props));
            expect(expectedRepoLink(workspaceRuntime, props)).toEqual(expectedRepoLink(publishedRuntime, props));
        });

        test("then LessonRepoPanel preserves repository hrefs and labels", async () => {
            const props: LessonRepoPanelProps = { git: repository };
            const doc = parseHtml(await renderRepoPanel(props));

            expect(projectLinks(doc)).toEqual(expectedLessonRepoLinks(workspaceRuntime, props));
            expect(expectedLessonRepoLinks(workspaceRuntime, props)).toEqual(
                expectedLessonRepoLinks(publishedRuntime, props),
            );
        });

        test("then LessonMetaPanel preserves commit hrefs and platform labels", async () => {
            const props: LessonMetaPanelProps = {
                metadata: createMetadata(),
                websiteRepoRefs: { github: { user: "org", repo: "web" } },
                platforms: ["github"],
            };
            const doc = parseHtml(await renderMetaPanel(props));

            expect(projectLinks(doc)).toEqual(expectedLessonMetaLinks(workspaceRuntime, props));
            expect(expectedLessonMetaLinks(workspaceRuntime, props)).toEqual(
                expectedLessonMetaLinks(publishedRuntime, props),
            );
        });
    });
});
