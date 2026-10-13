/** DOM, layout, browser-font, and source-revision measurements for the combined specimen. */
import { type CDPSession, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { type RequiredRoleState, requiredRoleStates } from "./font-loading";

const reviewSelector = "[data-visual-review=\"three-role-system\"]";
const revisionFiles = [
  ".gitlab-ci.yml",
  "package.json",
  "playwright.typography.config.ts",
  "src/components/meta/Head.astro",
  "src/lib/typography/production-font-stylesheet.ts",
  "src/lib/typography/__tests__/typography-playwright-config.test.ts",
  "src/pages/dev-fixtures/typography-proportional-pair.astro",
  "src/pages/dev-fixtures/_components/RoleConformanceSection.astro",
  "src/pages/dev-fixtures/_components/CombinedSystemSection.astro",
  "src/pages/dev-fixtures/__tests__/typography-proportional-pair.render.test.ts",
  "tests/e2e/typography-body-evaluation.spec.ts",
  "tests/e2e/typography-body-evaluation/checks.ts",
  "tests/e2e/typography-evaluation-common.ts",
  "tests/e2e/typography-heading-evaluation.spec.ts",
  "tests/e2e/typography-heading-evaluation/checks.ts",
  "tests/e2e/typography-font-resource-policy.ts",
  "tests/e2e/typography-glyph-attribution.spec.ts",
  "tests/e2e/typography-glyph-attribution.ts",
  "tests/e2e/typography-ligatures.spec.ts",
  "tests/e2e/typography-source-preservation.spec.ts",
  "tests/e2e/typography-source-preservation.ts",
  "tests/e2e/typography-system-evaluation.spec.ts",
  "tests/e2e/typography-theme.spec.ts",
  "tests/e2e/tsconfig.json",
  "tests/e2e/typography-system-evaluation/capture.ts",
  "tests/e2e/typography-system-evaluation/font-loading.ts",
  "tests/e2e/typography-system-evaluation/metrics.ts",
  "tests/e2e/typography-system-evaluation/run.ts",
] as const;

type RevisionFilePath = (typeof revisionFiles)[number];

type RevisionFile = {
  path: RevisionFilePath;
  sha256: string;
};

export type SourceRevision = {
  commitSha: string;
  worktree: "modified" | "clean";
  files: RevisionFile[];
};

export type PlatformFont = {
  familyName: string;
  glyphCount: number;
  isCustomFont?: boolean;
};

export type RenderedCodeFonts = {
  fonts: readonly PlatformFont[];
  firaGlyphCount: number;
};

export type RoleStyle = {
  id: RequiredRoleState["id"];
  expectedFamily: RequiredRoleState["family"];
  expectedWeight: RequiredRoleState["weight"];
  expectedStyle: RequiredRoleState["style"];
  observedFamily: string;
  weight: string;
  style: string;
  size: string;
  lineHeight: string;
  synthesis: string;
  width: number;
  height: number;
  left: number;
  right: number;
  clientWidth: number;
  scrollWidth: number;
};

type RoleStyleRow = readonly [
  string,
  readonly [string, string, string],
  readonly [string, string, string, string, string, string],
  readonly [number, number, number, number, number, number],
];

function readRoleStylesInPage(roles: readonly RequiredRoleState[]): RoleStyleRow[] {
  const review = document.querySelector<HTMLElement>("[data-visual-review='three-role-system']");
  if (!review) throw new Error("The three-role review region is missing.");
  return roles.map((role) => {
    const element = review.querySelector<HTMLElement>(role.selector);
    if (!element) throw new Error(`Missing ${role.id} specimen.`);
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return [
      role.id,
      [role.family, role.weight, role.style],
      [
        style.fontFamily,
        style.fontWeight,
        style.fontStyle,
        style.fontSize,
        style.lineHeight,
        style.fontSynthesis,
      ],
      [rect.width, rect.height, rect.left, rect.right, element.clientWidth, element.scrollWidth],
    ] as RoleStyleRow;
  });
}

export async function readRoleStyles(page: Page): Promise<RoleStyle[]> {
  const rows = await page.evaluate(readRoleStylesInPage, requiredRoleStates);
  return rows.map(toRoleStyle);
}

function toRoleStyle([id, expected, computed, bounds]: RoleStyleRow): RoleStyle {
  const [expectedFamily, expectedWeight, expectedStyle] = expected;
  const [observedFamily, weight, style, size, lineHeight, synthesis] = computed;
  const [width, height, left, right, clientWidth, scrollWidth] = bounds;
  return {
    id: id as RequiredRoleState["id"],
    expectedFamily: expectedFamily as RequiredRoleState["family"],
    expectedWeight: expectedWeight as RequiredRoleState["weight"],
    expectedStyle: expectedStyle as RequiredRoleState["style"],
    observedFamily,
    weight,
    style,
    size,
    lineHeight,
    synthesis,
    width,
    height,
    left,
    right,
    clientWidth,
    scrollWidth,
  };
}

const readDocumentDimensionsInPage = () => ({
  documentWidth: document.documentElement.scrollWidth,
  viewportWidth: document.documentElement.clientWidth,
  deviceScaleFactor: window.devicePixelRatio,
})

function readReadingRegionInPage(selector: string) {
  const review = document.querySelector<HTMLElement>(selector);
  if (!review) throw new Error("The review region is missing.");
  const region = review.getBoundingClientRect();
  return {
    left: region.left,
    right: region.right,
    width: region.width,
    height: region.height,
    clientWidth: review.clientWidth,
    scrollWidth: review.scrollWidth,
  };
}

function readCodeReviewInPage(selector: string) {
  const review = document.querySelector<HTMLElement>(selector);
  const code = review?.querySelector<HTMLElement>("pre[data-typography-role='code-block']");
  if (!code) throw new Error("The code block is missing.");
  const codeRect = code.getBoundingClientRect();
  return {
    codeBlock: {
      width: codeRect.width,
      height: codeRect.height,
      clientWidth: code.clientWidth,
      scrollWidth: code.scrollWidth,
      overflowX: getComputedStyle(code).overflowX,
    },
    sourceText: code.querySelector("code")?.textContent ?? "",
  };
}

export async function readLayout(page: Page) {
  const [documentDimensions, readingRegion, codeReview] = await Promise.all([
    page.evaluate(readDocumentDimensionsInPage),
    page.evaluate(readReadingRegionInPage, reviewSelector),
    page.evaluate(readCodeReviewInPage, reviewSelector),
  ]);
  return { ...documentDimensions, readingRegion, ...codeReview };
}

export async function readSourceRevision(): Promise<SourceRevision> {
  const commitSha = readGitValue(["rev-parse", "HEAD"]);
  const status = readGitValue(["status", "--short"]);
  const files = await Promise.all(revisionFiles.map(readFileRevision));
  return { commitSha, worktree: status ? "modified" : "clean", files };
}

export async function readRenderedCodeFonts(page: Page): Promise<RenderedCodeFonts> {
  const client = await page.context().newCDPSession(page);
  const nodeId = await findCodeNode(client);
  const { fonts } = await client.send("CSS.getPlatformFontsForNode", { nodeId });
  return { fonts, firaGlyphCount: countFiraGlyphs(fonts) };
}

/** Return Chromium's rendered-font report for each isolated glyph node matching a selector. */
export async function readRenderedFontsForNodes(
  page: Page,
  selector: string,
): Promise<PlatformFont[][]> {
  const client = await page.context().newCDPSession(page);
  try {
    const nodeIds = await queryNodeIds(client, selector);
    expect(nodeIds.length, `Chromium resolves nodes for ${selector}`).toBeGreaterThan(0);
    return await Promise.all(nodeIds.map((nodeId) => readNodeFonts(client, nodeId)));
  } finally {
    await client.detach();
  }
}

async function queryNodeIds(client: CDPSession, selector: string): Promise<number[]> {
  await client.send("DOM.enable");
  await client.send("CSS.enable");
  const { root } = await client.send("DOM.getDocument");
  const { nodeIds } = await client.send("DOM.querySelectorAll", {
    nodeId: root.nodeId,
    selector,
  });
  return nodeIds;
}

async function readNodeFonts(client: CDPSession, nodeId: number): Promise<PlatformFont[]> {
  const { fonts } = await client.send("CSS.getPlatformFontsForNode", { nodeId });
  return fonts;
}

async function findCodeNode(client: CDPSession): Promise<number> {
  await client.send("DOM.enable");
  await client.send("CSS.enable");
  const { root } = await client.send("DOM.getDocument");
  const { nodeId } = await client.send("DOM.querySelector", {
    nodeId: root.nodeId,
    selector: `${reviewSelector} pre[data-typography-role=\"code-block\"] > code`,
  });
  expect(nodeId, "Chromium resolves the code specimen to a DOM node").toBeGreaterThan(0);
  return nodeId;
}

const countFiraGlyphs = (fonts: readonly PlatformFont[]): number =>
  fonts.filter((font) => font.familyName.startsWith("Fira Code"))
    .reduce((count, font) => count + font.glyphCount, 0);

const readGitValue = (args: string[]): string =>
  execFileSync("git", args, { encoding: "utf8" }).trim();

const readFileRevision = async (path: RevisionFilePath): Promise<RevisionFile> => ({
  path,
  sha256: createHash("sha256").update(await readFile(resolve(path))).digest("hex"),
});
