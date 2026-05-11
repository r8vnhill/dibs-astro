import { normalizeLessonRoute, type LessonRoute } from "@ravenhill/lesson-export-core";

type LessonPageModule = Readonly<{
    default?: unknown;
}>;

type LessonPageModules = Readonly<Record<string, LessonPageModule>>;

export interface LessonPageRegistryEntry {
    readonly route: LessonRoute;
    readonly sourceFile: string;
    readonly component: unknown;
}

export interface LessonPageRegistry {
    readonly entries: ReadonlyMap<LessonRoute, LessonPageRegistryEntry>;
    resolve(route: string): LessonPageRegistryEntry;
}

const lessonPages = import.meta.glob("../../pages/notes/**/*.astro", {
    eager: true,
}) as LessonPageModules;

const defaultLessonPageRegistry = buildLessonPageRegistry(lessonPages);

export function getLessonPageRegistry(): LessonPageRegistry {
    return defaultLessonPageRegistry;
}

export function buildLessonPageRegistry(modules: LessonPageModules): LessonPageRegistry {
    const entries = new Map<LessonRoute, LessonPageRegistryEntry>();
    const issues: string[] = [];

    for (const [modulePath, module] of Object.entries(modules)) {
        const sourceFile = modulePathToSourceFile(modulePath);
        const component = module.default;

        if (component === undefined) {
            issues.push(`Missing default export for ${sourceFile}.`);
            continue;
        }

        const route = sourceFileToLessonRoute(sourceFile);
        if (entries.has(route)) {
            const previous = entries.get(route);
            issues.push(
                `Multiple lesson pages map to ${route}: ${previous?.sourceFile ?? "unknown"} and ${sourceFile}.`,
            );
            continue;
        }

        entries.set(route, {
            route,
            sourceFile,
            component,
        });
    }

    if (issues.length > 0) {
        throw new Error(`Lesson page registry is invalid:\n- ${issues.join("\n- ")}`);
    }

    return {
        entries,
        resolve(route: string): LessonPageRegistryEntry {
            const normalized = normalizeLessonRoute(route);
            const entry = entries.get(normalized);

            if (!entry) {
                throw new Error(`No lesson page found for ${normalized}.`);
            }

            return entry;
        },
    };
}

function modulePathToSourceFile(modulePath: string): string {
    const notesStart = modulePath.lastIndexOf("/notes/");
    if (notesStart === -1) {
        throw new Error(`Lesson page module path must include /notes/: ${modulePath}`);
    }

    return `src/pages${modulePath.slice(notesStart)}`;
}

function sourceFileToLessonRoute(sourceFile: string): LessonRoute {
    const pagePath = sourceFile.slice("src/pages/".length);

    if (!pagePath.startsWith("notes/")) {
        throw new Error(`Lesson page source file must live under src/pages/notes/: ${sourceFile}`);
    }

    const withoutExtension = pagePath.replace(/\.astro$/u, "");
    const withoutIndex = withoutExtension.endsWith("/index")
        ? withoutExtension.slice(0, -"/index".length)
        : withoutExtension;

    return normalizeLessonRoute(`/${withoutIndex}`);
}