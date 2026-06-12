import { describe, expect, test } from "vitest";
import {
    type BookExportCourseEntry,
    type BookExportCourseTree,
    type ExportRoute,
    type LessonExportManifest,
    type LessonRoute,
    type PdfOutputPath,
    planBookExports,
} from "../src";

describe("given book export planning", () => {
    test("then the public planner returns an empty plan for an empty course", () => {
        const plan = planBookExports({
            course: emptyCourse(),
            manifest: emptyManifest(),
            outDir: "dist/pdf",
            availablePdfPaths: new Set(),
            fullCourse: { title: "The Red Book of Westmarch" },
        });

        expect(plan.targets).toEqual([]);
        expect(plan.findings).toEqual([]);
    });
});

describe("given full-course book planning", () => {
    test("then it plans the full-course target in pre-order course order", () => {
        const plan = planBookExports({
            course: courseTree([
                unitGroup("unit-1", "The Shire", [
                    lesson("bag-end", "Bag End", "/notes/bag-end"),
                    lesson("the-green-dragon", "The Green Dragon", "/notes/the-green-dragon"),
                ]),
                unitGroup("unit-2", "Rivendell", [
                    lesson("the-council-of-elrond", "The Council of Elrond", "/notes/the-council-of-elrond"),
                ]),
            ]),
            manifest: manifestWithRoutes([
                ["/notes/bag-end", "Bag End"],
                ["/notes/the-green-dragon", "The Green Dragon"],
                ["/notes/the-council-of-elrond", "The Council of Elrond"],
            ]),
            outDir: "dist/pdf",
            availablePdfPaths: new Set([
                "dist/pdf/notes/bag-end.pdf",
                "dist/pdf/notes/the-green-dragon.pdf",
                "dist/pdf/notes/the-council-of-elrond.pdf",
            ]),
            fullCourse: { title: "There and Back Again" },
        });

        const fullCourse = findTarget(plan, "full-course");

        expect(fullCourse).toMatchObject({
            id: "full-course",
            title: "There and Back Again",
            kind: "full-course",
        });
        expect(fullCourse.lessons.map((entry) => entry.route)).toEqual([
            "/notes/bag-end/",
            "/notes/the-green-dragon/",
            "/notes/the-council-of-elrond/",
        ]);
    });

    test("then it skips structural course groups without reporting findings", () => {
        const plan = planBookExports({
            course: courseTree([
                unitGroup("unit-1", "The Shire", [
                    unitGroup("inns", "Inns", [
                        lesson("the-green-dragon", "The Green Dragon", "/notes/the-green-dragon"),
                    ]),
                ]),
            ]),
            manifest: manifestWithRoutes([["/notes/the-green-dragon", "The Green Dragon"]]),
            outDir: "dist/pdf",
            availablePdfPaths: new Set(["dist/pdf/notes/the-green-dragon.pdf"]),
            fullCourse: { title: "There and Back Again" },
        });

        expect(plan.findings).toEqual([]);
        expect(plan.targets[0]?.findings).toEqual([]);
        expect(plan.targets[0]?.lessons.map((entry) => entry.id)).toEqual(["the-green-dragon"]);
    });

    test("then it skips course lessons that are absent from the manifest", () => {
        const plan = planBookExports({
            course: courseTree([
                unitGroup("unit-1", "The Shire", [
                    lesson("bag-end", "Bag End", "/notes/bag-end"),
                    lesson("old-forest", "Old Forest", "/notes/old-forest"),
                ]),
            ]),
            manifest: manifestWithRoutes([["/notes/bag-end", "Bag End"]]),
            outDir: "dist/pdf",
            availablePdfPaths: new Set(["dist/pdf/notes/bag-end.pdf"]),
            fullCourse: { title: "There and Back Again" },
        });

        expect(plan.findings).toEqual([]);
        expect(plan.targets[0]?.lessons.map((entry) => entry.id)).toEqual(["bag-end"]);
    });
});

describe("given unit book planning", () => {
    test("then it creates one target per top-level unit group", () => {
        const plan = planBookExports(unitFixture());

        expect(plan.targets.map((target) => target.id)).toEqual([
            "full-course",
            "unit-1",
            "unit-2",
        ]);
    });

    test("then each unit target includes only its descendant lessons", () => {
        const plan = planBookExports(unitFixture());

        const unitOne = findTarget(plan, "unit-1");
        const unitTwo = findTarget(plan, "unit-2");

        expect(unitOne.lessons.map((entry) => entry.id)).toEqual([
            "bag-end",
            "the-green-dragon",
        ]);
        expect(unitTwo.lessons.map((entry) => entry.id)).toEqual([
            "the-council-of-elrond",
        ]);
    });

    test("then it does not create unit targets for nested groups", () => {
        const plan = planBookExports({
            ...unitFixture(),
            course: courseTree([
                unitGroup("unit-1", "The Shire", [
                    unitGroup("inns", "Inns", [
                        lesson("the-green-dragon", "The Green Dragon", "/notes/the-green-dragon"),
                    ]),
                ]),
            ]),
            manifest: manifestWithRoutes([["/notes/the-green-dragon", "The Green Dragon"]]),
            availablePdfPaths: new Set(["dist/pdf/notes/the-green-dragon.pdf"]),
        });

        expect(plan.targets.map((target) => target.id)).toEqual(["full-course", "unit-1"]);
        expect(findTarget(plan, "unit-1").lessons.map((entry) => entry.id)).toEqual(["the-green-dragon"]);
    });
});

describe("given route matching for book planning", () => {
    test.each([
        ["/notes/bag-end", "/notes/bag-end/"],
        ["notes/bag-end", "/notes/bag-end"],
        ["/notes/bag-end/", "notes/bag-end"],
    ])("then equivalent route spellings match: %s and %s", (courseRoute, manifestRoute) => {
        const plan = planBookExports(routeFixture(courseRoute, manifestRoute));

        expect(findTarget(plan, "full-course").lessons).toHaveLength(1);
        expect(findTarget(plan, "full-course").lessons[0]).toMatchObject({
            id: "bag-end",
            title: "Bag End",
            route: normalizeFixtureRoute(manifestRoute),
            pdfPath: pdfOutputPathForRoute(manifestRoute),
        });
        expect(plan.findings).toEqual([]);
    });

    test("then duplicate manifest routes keep the first entry and report findings", () => {
        const plan = planBookExports({
            ...routeFixture("/notes/bag-end", "/notes/bag-end"),
            manifest: manifestWithRawRoutes([
                ["/notes/bag-end", "Bag End"],
                ["/notes/bag-end/", "Duplicate Bag End"],
            ]),
            availablePdfPaths: new Set(["dist/pdf/notes/bag-end.pdf"]),
        });

        expect(findTarget(plan, "full-course").lessons).toEqual([
            expect.objectContaining({
                title: "Bag End",
                route: "/notes/bag-end/",
                pdfPath: "dist/pdf/notes/bag-end.pdf",
            }),
        ]);
        expect(plan.findings).toEqual([
            expect.objectContaining({
                code: "duplicate-manifest-route",
                severity: "warning",
                route: "/notes/bag-end/",
            }),
        ]);
    });
});

describe("given book output path safety", () => {
    test("then it plans deterministic output paths under the output directory", () => {
        const plan = planBookExports(unitFixture());

        expect(findTarget(plan, "full-course").outputPath).toBe("dist/pdf/books/full-course.pdf");
        expect(findTarget(plan, "unit-1").outputPath).toBe("dist/pdf/books/units/unit-1.pdf");
    });

    test.each([
        ["../outside"],
        ["units/../../outside"],
        ["/absolute/path"],
        ["C:\\outside"],
        ["..\\outside"],
    ])("then it reports unsafe target ids as findings: %s", (unsafeId) => {
        const plan = planBookExports(unitFixtureWithUnitId(unsafeId));

        expect(plan.findings).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    code: "unsafe-output-path",
                    severity: "error",
                    targetId: unsafeId,
                }),
            ]),
        );
        expect(plan.targets.map((target) => target.id)).not.toContain(unsafeId);
    });
});

describe("given missing lesson PDF inputs", () => {
    test("then it reports missing lesson PDFs on the relevant target", () => {
        const plan = planBookExports({
            ...unitFixture(),
            availablePdfPaths: new Set(["dist/pdf/notes/bag-end.pdf"]),
        });

        const fullCourse = findTarget(plan, "full-course");

        expect(fullCourse.findings).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    code: "missing-input",
                    severity: "warning",
                    targetId: "full-course",
                    lessonId: "the-green-dragon",
                    route: "/notes/the-green-dragon/",
                    path: "dist/pdf/notes/the-green-dragon.pdf",
                }),
            ]),
        );
        expect(plan.findings).toEqual(expect.arrayContaining([...fullCourse.findings]));
    });

    test("then it keeps valid lessons and targets when some inputs are missing", () => {
        const plan = planBookExports({
            ...unitFixture(),
            availablePdfPaths: new Set(["dist/pdf/notes/bag-end.pdf"]),
        });

        expect(findTarget(plan, "full-course").lessons.map((lessonEntry) => lessonEntry.id)).toContain("bag-end");
        expect(plan.targets.map((target) => target.id)).toContain("unit-1");
    });
});

function emptyCourse(): BookExportCourseTree {
    return [];
}

function emptyManifest(): LessonExportManifest {
    return {
        generatedAt: "2026-06-11T00:00:00.000Z",
        entries: [],
    };
}

function courseTree(entries: readonly BookExportCourseEntry[]): BookExportCourseTree {
    return entries;
}

function unitGroup(
    id: string,
    title: string,
    children: readonly BookExportCourseEntry[],
): BookExportCourseEntry {
    return {
        id,
        title,
        kind: "group",
        children,
    };
}

function lesson(id: string, title: string, href: string): BookExportCourseEntry {
    return {
        id,
        title,
        kind: "link",
        href,
    };
}

function manifestWithRoutes(routes: readonly (readonly [route: string, title: string])[]): LessonExportManifest {
    return {
        generatedAt: "2026-06-11T00:00:00.000Z",
        entries: routes.map(([route, title]) => ({
            route: normalizeFixtureRoute(route),
            exportRoute: normalizeFixtureExportRoute(route),
            title,
            sourceFile: `src/pages${normalizeFixtureRoute(route)}index.astro`,
            outputPath: pdfOutputPathForRoute(route),
        })),
    };
}

function manifestWithRawRoutes(routes: readonly (readonly [route: string, title: string])[]): LessonExportManifest {
    return {
        generatedAt: "2026-06-11T00:00:00.000Z",
        entries: routes.map(([route, title]) => ({
            route: route as LessonRoute,
            exportRoute: normalizeFixtureExportRoute(route),
            title,
            sourceFile: `src/pages${normalizeFixtureRoute(route)}index.astro`,
            outputPath: pdfOutputPathForRoute(route),
        })),
    };
}

function normalizeFixtureRoute(route: string): LessonRoute {
    const path = route.startsWith("/") ? route : `/${route}`;
    return (path.endsWith("/") ? path : `${path}/`) as LessonRoute;
}

function normalizeFixtureExportRoute(route: string): ExportRoute {
    return `/exports/pdf${normalizeFixtureRoute(route)}` as ExportRoute;
}

function pdfOutputPathForRoute(route: string): PdfOutputPath {
    const normalized = normalizeFixtureRoute(route);
    return `dist/pdf${normalized.slice(0, -1)}.pdf` as PdfOutputPath;
}

function unitFixture(): Parameters<typeof planBookExports>[0] {
    return {
        course: courseTree([
            unitGroup("unit-1", "The Shire", [
                lesson("bag-end", "Bag End", "/notes/bag-end"),
                lesson("the-green-dragon", "The Green Dragon", "/notes/the-green-dragon"),
            ]),
            unitGroup("unit-2", "Rivendell", [
                lesson("the-council-of-elrond", "The Council of Elrond", "/notes/the-council-of-elrond"),
            ]),
        ]),
        manifest: manifestWithRoutes([
            ["/notes/bag-end", "Bag End"],
            ["/notes/the-green-dragon", "The Green Dragon"],
            ["/notes/the-council-of-elrond", "The Council of Elrond"],
        ]),
        outDir: "dist/pdf",
        availablePdfPaths: new Set([
            "dist/pdf/notes/bag-end.pdf",
            "dist/pdf/notes/the-green-dragon.pdf",
            "dist/pdf/notes/the-council-of-elrond.pdf",
        ]),
        fullCourse: { title: "There and Back Again" },
    };
}

function routeFixture(courseRoute: string, manifestRoute: string): Parameters<typeof planBookExports>[0] {
    const pdfPath = pdfOutputPathForRoute(manifestRoute);

    return {
        course: courseTree([
            unitGroup("unit-1", "The Shire", [
                lesson("bag-end", "Bag End", courseRoute),
            ]),
        ]),
        manifest: manifestWithRawRoutes([[manifestRoute, "Bag End"]]),
        outDir: "dist/pdf",
        availablePdfPaths: new Set([pdfPath]),
        fullCourse: { title: "There and Back Again" },
    };
}

function unitFixtureWithUnitId(unitId: string): Parameters<typeof planBookExports>[0] {
    return {
        ...unitFixture(),
        course: courseTree([
            unitGroup(unitId, "The Shire", [
                lesson("bag-end", "Bag End", "/notes/bag-end"),
            ]),
        ]),
        manifest: manifestWithRoutes([["/notes/bag-end", "Bag End"]]),
        availablePdfPaths: new Set(["dist/pdf/notes/bag-end.pdf"]),
    };
}

function findTarget(plan: ReturnType<typeof planBookExports>, id: string) {
    const target = plan.targets.find((candidate) => candidate.id === id);

    expect(target).toBeDefined();

    return target!;
}
