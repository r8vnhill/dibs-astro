/**
 * @packageDocumentation
 *
 * Public API for `@ravenhill/html-core`.
 *
 * This package provides host-agnostic HTML semantic primitives that can be shared by applications,
 * rendering adapters, and tests without importing Astro, DOM APIs, UI components, generated data, or
 * site-specific configuration.
 *
 * Import from this entry point only. Subpath imports are not part of the supported package
 * contract.
 */

import packageJson from "../package.json" with { type: "json" };

/**
 * Canonical package name.
 *
 * Use this value in diagnostics, package identity tests, and compatibility checks instead of
 * duplicating the literal package name.
 */
export const HTML_CORE_PACKAGE_NAME = "@ravenhill/html-core";

/**
 * Current package version.
 *
 * The value is read from package metadata so runtime diagnostics report the same version as the
 * package manager.
 */
export const HTML_CORE_VERSION = packageJson.version;

/**
 * Valid HTML heading tag names.
 *
 * Use this type for component props or host-agnostic helpers that need to restrict values to the
 * six standard HTML heading levels.
 */
export type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
