/** Font resource policy and loading assertions shared by the combined-system evaluation. */
import { expect, type Page, type Request, type Response } from "@playwright/test";
import {
  productionFontStylesheetUrl,
} from "../../../src/lib/typography/production-font-stylesheet";
import { isProductionFiraCodeFontResource } from "../typography-font-resource-policy";

export type FontResponse = Readonly<{ url: string; status: number; resourceType: string }>;
export type FontFaceState = Readonly<{
  family: string;
  style: string;
  status: FontFaceLoadStatus;
  weight: string;
}>;

export const requiredLocalFaces = [
  {
    family: "DIBS Sans",
    style: "normal",
    weight: "400",
    path: "/fonts/dibs-sans/400-normal.woff2",
  },
  {
    family: "DIBS Sans",
    style: "italic",
    weight: "400",
    path: "/fonts/dibs-sans/400-italic.woff2",
  },
  {
    family: "DIBS Sans",
    style: "normal",
    weight: "500",
    path: "/fonts/dibs-sans/500-normal.woff2",
  },
  {
    family: "DIBS Sans",
    style: "normal",
    weight: "700",
    path: "/fonts/dibs-sans/700-normal.woff2",
  },
  {
    family: "DIBS Slab",
    style: "normal",
    weight: "500",
    path: "/fonts/dibs-slab/500-normal.woff2",
  },
  {
    family: "DIBS Slab",
    style: "normal",
    weight: "700",
    path: "/fonts/dibs-slab/700-normal.woff2",
  },
] as const;

export const requiredRoleStates = [
  { id: "primary-heading", selector: "h2", family: "DIBS Slab", weight: "700", style: "normal" },
  { id: "subheading", selector: "h3", family: "DIBS Slab", weight: "500", style: "normal" },
  {
    id: "prose",
    selector: "p[data-typography-role=\"prose\"]",
    family: "DIBS Sans",
    weight: "400",
    style: "normal",
  },
  {
    id: "italic-emphasis",
    selector: "em",
    family: "DIBS Sans",
    weight: "400",
    style: "italic",
  },
  {
    id: "medium-emphasis",
    selector: "[data-typography-state=\"500-normal\"]",
    family: "DIBS Sans",
    weight: "500",
    style: "normal",
  },
  {
    id: "strong-emphasis",
    selector: "strong",
    family: "DIBS Sans",
    weight: "700",
    style: "normal",
  },
  {
    id: "inline-code",
    selector: "code[data-typography-role=\"inline-code\"]",
    family: "Fira Code",
    weight: "400",
    style: "normal",
  },
  {
    id: "code-block",
    selector: "pre[data-typography-role=\"code-block\"] > code",
    family: "Fira Code",
    weight: "400",
    style: "normal",
  },
] as const;

export type RequiredRoleState = (typeof requiredRoleStates)[number];
export type FontResourceTracker = {
  responses: FontResponse[];
  failedRequests: string[];
  stylesheetStatus?: number;
};

export function watchFontResources(page: Page): FontResourceTracker {
  const tracker: FontResourceTracker = { responses: [], failedRequests: [] };
  page.on("response", (response) => recordFontResponse(tracker, response));
  page.on("requestfailed", (request) => recordFailedFontRequest(tracker, request));
  return tracker;
}

export const loadRequiredFaces = async (page: Page): Promise<FontFaceState[]> =>
  page.evaluate(async (localFaces) => {
    for (const face of localFaces) {
      await document.fonts.load(`${face.weight} 16px "${face.family}"`, "Typography evaluation");
    }
    await document.fonts.load("400 16px \"Fira Code\"", "list.filter x -> x * 2");
    await document.fonts.ready;
    return [...document.fonts]
      .map(({ family, style, status, weight }) => ({
        family: family.replace(/^"|"$/g, ""),
        style,
        status,
        weight,
      }))
      .filter((face) => ["DIBS Sans", "DIBS Slab", "Fira Code"].includes(face.family));
  }, requiredLocalFaces);

export function assertRequiredFacesLoaded(faces: readonly FontFaceState[]): void {
  for (const face of requiredLocalFaces) assertFaceLoaded(faces, face);
  expect(faces.some(isLoadedFiraCodeFace), "Fira Code face is loaded").toBe(true);
}

export const assertFontResources = async (
  page: Page,
  tracker: FontResourceTracker,
  faces: readonly FontFaceState[],
): Promise<void> => {
  await assertStylesheetResponse(page, tracker);
  assertSuccessfulFontResponses(tracker.responses);
  assertApprovedExternalFonts(tracker.responses, page.url());
  assertLocalFaceResponses(tracker.responses, faces, page.url());
  expect(tracker.failedRequests).toEqual([]);
};

function recordFontResponse(tracker: FontResourceTracker, response: Response): void {
  if (response.url() === productionFontStylesheetUrl) tracker.stylesheetStatus = response.status();
  if (response.request().resourceType() !== "font") return;
  tracker.responses.push({ url: response.url(), status: response.status(), resourceType: "font" });
}

const recordFailedFontRequest = (tracker: FontResourceTracker, request: Request): number | null =>
  request.resourceType() === "font" ? tracker.failedRequests.push(request.url()) : null;

function assertFaceLoaded(
  faces: readonly FontFaceState[],
  expected: (typeof requiredLocalFaces)[number],
): void {
  expect(faces, `${expected.family} ${expected.weight} ${expected.style}`).toContainEqual({
    family: expected.family,
    style: expected.style,
    status: "loaded",
    weight: expected.weight,
  });
}

const isLoadedFiraCodeFace = (face: FontFaceState): boolean =>
  face.family === "Fira Code" && face.style === "normal" && face.status === "loaded";

async function assertStylesheetResponse(page: Page, tracker: FontResourceTracker): Promise<void> {
  await expect(page.locator(`link[href="${productionFontStylesheetUrl}"]`)).toHaveCount(1);
  expect(isSuccessfulResourceStatus(tracker.stylesheetStatus ?? 0)).toBe(true);
}

function assertSuccessfulFontResponses(responses: readonly FontResponse[]): void {
  expect(responses.length).toBeGreaterThan(0);
  expect(responses.every((response) => isSuccessfulResourceStatus(response.status))).toBe(true);
}

function assertApprovedExternalFonts(responses: readonly FontResponse[], pageUrl: string): void {
  const origin = new URL(pageUrl).origin;
  const external = responses.filter((response) => new URL(response.url).origin !== origin);
  expect(external.length).toBeGreaterThan(0);
  expect(external.every((response) => isProductionFiraCodeFontResource(response.url))).toBe(true);
}

function assertLocalFaceResponses(
  responses: readonly FontResponse[],
  faces: readonly FontFaceState[],
  pageUrl: string,
): void {
  const origin = new URL(pageUrl).origin;
  const paths = responses
    .filter((response) => new URL(response.url).origin === origin)
    .map((response) => new URL(response.url).pathname);
  for (const expected of requiredLocalFaces) {
    expect(paths, expected.path).toContain(expected.path);
    assertFaceLoaded(faces, expected);
  }
}

const isSuccessfulResourceStatus = (status: number): boolean =>
  (status >= 200 && status < 300) || status === 304;
