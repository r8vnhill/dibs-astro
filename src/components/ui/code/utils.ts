/**
 * Normalizes the indentation of a multi-line code string.
 *
 * Removes leading/trailing blank lines and adjusts indentation so that the least-indented line
 * starts at column 0.
 *
 * @param code The raw multi-line code string.
 * @returns The normalized code string.
 */
export function normalizeIndentation(code: string): string {
  const lines = code.split("\n");

  // Remove leading/trailing blank lines
  while (lines.length > 0 && lines[0] !== undefined && lines[0].trim() === "")
    lines.shift();
  while (
    lines.length > 0 &&
    lines[lines.length - 1] !== undefined &&
    typeof lines[lines.length - 1] === "string" &&
    lines[lines.length - 1]!.trim() === ""
  ) {
    lines.pop();
  }

  // Determine the minimum indentation of non-empty lines
  const indentLengths = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const match = line.match(/^[ \t]*/);
      return match && match[0] ? match[0].length : 0;
    });

  const minIndent = indentLengths.length > 0 ? Math.min(...indentLengths) : 0;

  // Normalize all lines
  return lines.map((line) => line.slice(minIndent)).join("\n");
}
