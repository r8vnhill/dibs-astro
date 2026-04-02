/**
 * Public barrel for code-rendering primitives and language-specialized wrappers.
 *
 * This module exposes three layers of the code UI surface:
 *
 * - shared building blocks such as `CodeBlock`, `InlineCode`, and `Terminals`;
 * - language-specific wrappers that pre-bind syntax highlighting and iconography;
 * - compatibility aliases like `PowerShellInline` / `InlinePowerShell` when the repo already uses
 *   both naming styles.
 *
 * Keep new exports thin: language wrappers should mostly bind `lang`, icon, and slot forwarding,
 * while shared rendering behavior stays centralized in the base primitives.
 */
export { default as CBlock } from "./c/CBlock.astro";
export { default as CInline } from "./c/CInline.astro";
export { default as CodeBlock } from "./CodeBlock.astro";
export { default as CsvBlock } from "./csv/CsvBlock.astro";
export { default as InlineCode } from "./InlineCode.astro";
export {
    default as InlineJavaScript,
    default as JavaScriptInline,
} from "./js/InlineJavaScript.astro";
export { default as JavaScriptBlock } from "./js/JavaScriptBlock.astro";
export { default as JsonBlock } from "./json/JsonBlock.astro";
export { default as InlineKotlin } from "./kt/InlineKotlin.astro";
export { default as KotlinBlock } from "./kt/KotlinBlock.astro";
export { default as MarkdownInline } from "./md/MarkdownInline.astro";
export { default as NushellInline } from "./nushell/NushellInline.astro";
export {
    default as InlinePowerShell,
    default as PowerShellInline,
} from "./ps1/InlinePowerShell.astro";
export { default as PowerShellBlock } from "./ps1/PowerShellBlock.astro";
export { default as PowerShellTerminal } from "./ps1/PowerShellTerminal.astro";
export { default as InlinePython, default as PythonInline } from "./py/InlinePython.astro";
export { default as PythonBlock } from "./py/PythonBlock.astro";
export { default as InlineRust } from "./rs/InlineRust.astro";
export { default as RustBlock } from "./rs/RustBlock.astro";
export { default as BashBlock, default as BashScript } from "./sh/BashScript.astro";
export { default as BashTerminal } from "./sh/BashTerminal.astro";
export { default as BashInline, default as InlineBash } from "./sh/InlineBash.astro";
export { default as SqlBlock } from "./sql/SqlBlock.astro";
export { default as SqlInline } from "./sql/SqlInline.astro";
export { default as Terminals } from "./Terminals.astro";
export { default as OutputBlock } from "./txt/OutputBlock.astro";
export { default as XmlBlock } from "./xml/XmlBlock.astro";
