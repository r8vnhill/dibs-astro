// Test setup: extend Vitest's expect with DOM matchers from Testing Library.
//
// We import the `vitest` entrypoint of `@testing-library/jest-dom` which registers helpful matchers such as:
//  - toBeInTheDocument()
//  - toHaveAttribute(name, value)
//  - toHaveClass(...)
//  - toHaveTextContent(...)
//
// These make assertions against DOM nodes more readable and are widely used across the test suite. Importing this file
// here (and referencing it via `vitest.config.ts` -> `setupFiles`) ensures every test file has those matchers available
// without repeating the import.
import "@testing-library/jest-dom/vitest";

// Phase 0 verification: Workspace resolution test
// This import proves that the root app can consume @ravenhill/content-core from packages/
// If this import fails, the workspace topology is not correctly wired.
import { CONTENT_CORE_PACKAGE_NAME, CONTENT_CORE_VERSION } from "@ravenhill/content-core";

// Verify package identity (diagnostic check during test setup)
if (process.env.DEBUG_WORKSPACE) {
    console.log(`Workspace validation: ${CONTENT_CORE_PACKAGE_NAME} v${CONTENT_CORE_VERSION}`);
}
