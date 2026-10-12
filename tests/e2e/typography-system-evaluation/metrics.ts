/** DOM, layout, browser-font, and source-revision measurements for the combined specimen. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, type CDPSession, type Page } from "@playwright/test";
import { requiredRoleStates, type RequiredRoleState } from "./font-loading";

const reviewSelector = "[data-visual-review=\"three-role-system\"]";
const revisionFiles = [
  "src/components/meta/Head.astro",
  "src/lib/typography/production-font-stylesheet.ts",
  "src/pages/dev-fixtures/typography-proportional-pair.astro",
  "src/pages/dev-fixtures/_components/CombinedSystemSection.astro",
  "src/pages/dev-fixtures/__tests__/typography-proportional-pair.render.test.ts",
  "tests/e2e/typography-body-evaluation.spec.ts",
  "tests/e2e/typography-body-evaluation/checks.ts",
  "tests/e2e/typography-evaluation-common.ts",
  "tests/e2e/typography-heading-evaluation.spec.ts",
  "tests/e2e/typography-heading-evaluation/checks.ts",
  "tests/e2e/typography-font-resource-policy.ts",
  "tests/e2e/typography-system-evaluation.spec.ts",
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

type PlatformFont = {
  familyName: string;
  glyphCount: number;
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

export const readRoleStyles = (page: Page): Promise<RoleStyle[]> =>
  page.evaluate((roles) => {
    const review = document.querySelector<HTMLElement>(
      "[data-visual-review=\"three-role-system\"]",
    );
    if (!review) throw new Error("The three-role review region is missing.");
    return roles.map((role) => readRoleStyle(review, role));

    function readRoleStyle(review: HTMLElement, role: RequiredRoleState): RoleStyle {
      const element = review.querySelector<HTMLElement>(role.selector);
      if (!element) throw new Error(`Missing ${role.id} specimen.`);
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        id: role.id, expectedFamily: role.family, expectedWeight: role.weight,
        expectedStyle: role.style, observedFamily: style.fontFamily,
        weight: style.fontWeight, style: style.fontStyle, size: style.fontSize,
        lineHeight: style.lineHeight, synthesis: style.fontSynthesis,
        width: rect.width, height: rect.height, left: rect.left, right: rect.right,
        clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
      };
    }
  }, requiredRoleStates);

export const readLayout = (page: Page) => page.evaluate((selector) => {
  const review = document.querySelector<HTMLElement>(selector);
  const code = review?.querySelector<HTMLElement>("pre[data-typography-role=\"code-block\"]");
  if (!review || !code) throw new Error("The review region or code block is missing.");
  const region = review.getBoundingClientRect();
  const codeRect = code.getBoundingClientRect();
  return {
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    deviceScaleFactor: window.devicePixelRatio,
    readingRegion: {
      left: region.left, right: region.right, width: region.width, height: region.height,
      clientWidth: review.clientWidth, scrollWidth: review.scrollWidth,
    },
    codeBlock: {
      width: codeRect.width, height: codeRect.height, clientWidth: code.clientWidth,
      scrollWidth: code.scrollWidth, overflowX: getComputedStyle(code).overflowX,
    },
    sourceText: code.querySelector("code")?.textContent ?? "",
  };
}, reviewSelector);

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
