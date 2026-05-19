/**
 * Assembles individual Turtle source files into a single concatenated TTL file.
 *
 * This module reads numbered TTL files from src/data/bibliography/sources/
 * and concatenates them in order (00, 01, 02, 03, 04, 05), ensuring:
 * - Prefix declarations appear only once (taken from 00-prefixes.ttl)
 * - All triples from other files are included
 * - Output is written to src/data/bibliography/catalog.graph.generated.ttl
 *
 * The assembly process maintains the original content and ensures the output
 * remains consistent with prior build artifacts.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Assembles TTL source files into a single output file.
 *
 * @param {string} sourcesDir - Directory containing numbered TTL source files
 * @param {string} outputFile - Path to the output concatenated TTL file
 * @throws {Error} If unable to read source files or write output
 */
export async function assembleTurtleFiles(sourcesDir, outputFile) {
    try {
        // List all files in the sources directory
        const files = await readdir(sourcesDir);

        // Filter and sort numbered TTL files (00-*.ttl through 05-*.ttl)
        const ttlFiles = files
            .filter((f) => f.endsWith(".ttl") && /^\d{2}-/.test(f))
            .sort();

        if (ttlFiles.length === 0) {
            throw new Error(`No numbered TTL files found in ${sourcesDir}`);
        }

        let output = "";
        let prefixesIncluded = false;

        // Process each file in order
        for (const file of ttlFiles) {
            const filePath = join(sourcesDir, file);
            const content = await readFile(filePath, "utf-8");
            const lines = content.split("\n");

            if (file === "00-prefixes.ttl") {
                // Include full content of prefixes file
                output += content;
                if (!output.endsWith("\n")) {
                    output += "\n";
                }
                prefixesIncluded = true;
            } else {
                // For other files, skip their prefix declarations (copy only triples)
                const tripleLines = lines.filter(
                    (line) => !line.startsWith("@prefix"),
                );

                // Remove leading/trailing empty lines from this section
                let firstNonEmpty = 0;
                while (
                    firstNonEmpty < tripleLines.length &&
                    tripleLines[firstNonEmpty].trim() === ""
                ) {
                    firstNonEmpty++;
                }

                let lastNonEmpty = tripleLines.length - 1;
                while (
                    lastNonEmpty >= 0 &&
                    tripleLines[lastNonEmpty].trim() === ""
                ) {
                    lastNonEmpty--;
                }

                if (firstNonEmpty <= lastNonEmpty) {
                    const trimmedTriples = tripleLines
                        .slice(firstNonEmpty, lastNonEmpty + 1)
                        .join("\n");
                    output += trimmedTriples;
                    if (!output.endsWith("\n")) {
                        output += "\n";
                    }
                }
            }
        }

        // Ensure output ends with a single newline
        output = output.trimEnd() + "\n";

        // Write the assembled content to the output file
        await writeFile(outputFile, output, "utf-8");

        console.log(
            `✓ TTL files assembled successfully: ${ttlFiles.length} files → ${outputFile}`,
        );
        return ttlFiles.length;
    } catch (error) {
        console.error(`✗ Error assembling TTL files:`, error.message);
        throw error;
    }
}

/**
 * Command-line usage: node assemble-ttl.mjs <sourcesDir> <outputFile>
 */
if (import.meta.url === `file://${process.argv[1]}`) {
    const sourcesDir =
        process.argv[2] ||
        join(__dirname, "../../../src/data/bibliography/sources");
    const outputFile =
        process.argv[3] ||
        join(
            __dirname,
            "../../../src/data/bibliography/catalog.graph.generated.ttl",
        );

    assembleTurtleFiles(sourcesDir, outputFile)
        .then((_count) => {
            process.exit(0);
        })
        .catch((_error) => {
            process.exit(1);
        });
}
