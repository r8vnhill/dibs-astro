/** Shared helpers for font requests and loaded-face checks in browser evaluations. */
import type { Page } from "@playwright/test";

export type FontFaceRecord = Readonly<{
  family: string;
  style: string;
  status: FontFaceLoadStatus;
  weight: string;
}>;

export function recordFontRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith(".woff2")) urls.push(request.url());
  });
  return urls;
}

export async function waitForEvaluationFonts(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
}

export const readLoadedFonts = (
  page: Page,
  families: readonly string[],
): Promise<FontFaceRecord[]> =>
  page.evaluate((expectedFamilies) =>
    [...document.fonts]
      .map(({ family, style, status, weight }) => ({
        family: family.replace(/^"|"$/g, ""),
        style,
        status,
        weight,
      }))
      .filter((face) => expectedFamilies.includes(face.family)), [...families]);

export const readFontResourcePaths = (page: Page): Promise<string[]> =>
  page.evaluate(() =>
    performance.getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((name) => name.endsWith(".woff2"))
      .map((name) => new URL(name).pathname)
  );

export const unexpectedExternalFontRequests = (
  requests: readonly string[],
  pageOrigin: string,
): string[] => requests.filter((url) => new URL(url).origin !== pageOrigin);
