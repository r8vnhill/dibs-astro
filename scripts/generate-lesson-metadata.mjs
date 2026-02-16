import fg from "fast-glob";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    buildLessonMetadataEntry,
    parseGitLogOutput,
} from "../src/lib/lesson-metadata/git-metadata.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const lessonGlob = "src/pages/notes/**/*.astro";
const authorsPath = path.join(projectRoot, "src/data/lesson-authors.json");
const configPath = path.join(projectRoot, "src/data/lesson-metadata.config.json");
const outputPath = path.join(projectRoot, "src/data/lesson-metadata.generated.json");
const changesLimit = 5;
const gitFieldDelimiter = "\u0000";

const readAuthorsByPath = async () => {
    try {
        const raw = await readFile(authorsPath, "utf8");
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
};

const readGeneratorConfig = async () => {
    try {
        const raw = await readFile(configPath, "utf8");
        const parsed = JSON.parse(raw);
        if (typeof parsed?.fallbackAuthorName === "string" && parsed.fallbackAuthorName.trim()) {
            return { fallbackAuthorName: parsed.fallbackAuthorName.trim() };
        }
        throw new Error("fallbackAuthorName no definido en lesson-metadata.config.json");
    } catch {
        throw new Error(
            "No se pudo cargar src/data/lesson-metadata.config.json con fallbackAuthorName válido.",
        );
    }
};

const readGitChangesForFile = (sourceFile) => {
    try {
        const output = execFileSync(
            "git",
            [
                "log",
                "--follow",
                "--date=short",
                `--pretty=format:%H%x00%ad%x00%an%x00%s`,
                "--",
                sourceFile,
            ],
            {
                cwd: projectRoot,
                encoding: "utf8",
                stdio: ["ignore", "pipe", "pipe"],
            },
        );

        return parseGitLogOutput(output, gitFieldDelimiter).slice(0, changesLimit);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[lesson-metadata] No se pudo leer git log para ${sourceFile}: ${message}`);
        return [];
    }
};

const ensureDir = async (filePath) => {
    await mkdir(path.dirname(filePath), { recursive: true });
};

const main = async () => {
    const [lessonFiles, authorsByPath, config] = await Promise.all([
        fg(lessonGlob, { cwd: projectRoot, absolute: false }),
        readAuthorsByPath(),
        readGeneratorConfig(),
    ]);

    const entries = {};
    for (const sourceFile of lessonFiles) {
        const changes = readGitChangesForFile(sourceFile);
        const entry = buildLessonMetadataEntry(
            sourceFile,
            changes,
            authorsByPath,
            "src/pages",
            config.fallbackAuthorName,
        );
        if (!entry) continue;
        entries[entry.path] = {
            sourceFile: entry.sourceFile,
            authors: entry.authors,
            ...(entry.lastModified ? { lastModified: entry.lastModified } : {}),
            changes: entry.changes,
        };
    }

    const output = {
        generatedAt: new Date().toISOString(),
        totalLessons: Object.keys(entries).length,
        changesLimit,
        entries,
    };

    await ensureDir(outputPath);
    await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
    console.log(
        `[lesson-metadata] Generado ${path.relative(projectRoot, outputPath)} con ${output.totalLessons} lecciones.`,
    );
};

main().catch((error) => {
    console.error("[lesson-metadata] Error inesperado:", error);
    process.exitCode = 1;
});
