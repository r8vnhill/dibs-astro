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
