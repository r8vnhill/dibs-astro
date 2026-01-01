/**
 * LessonTree navigation behaviors tests.
 *
 * These tests validate the navigation and persistence logic of the LessonTree component, ensuring that:
 *  - Deep paths automatically expand their parent nodes.
 *  - The expand/collapse state persists via localStorage.
 */

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { courseStructure } from "../../../data/course-structure";
import { LessonTree } from "../LessonTree";

/**
 * Helper to simulate navigation.
 * Updates the window's current path, allowing the component to detect the active lesson and auto-open parent branches
 * accordingly.
 */
function setPath(path: string) {
    window.history.pushState({}, "test", path);
}

describe("LessonTree navigation behaviors", () => {
    // Key used to persist expand/collapse state in localStorage
    const persistKey = "test-lesson-tree";

    beforeEach(() => {
        // Clear any persisted state before each test
        localStorage.removeItem(persistKey);
    });

    afterEach(() => {
        // Clean up rendered DOM and localStorage after each test
        cleanup();
        localStorage.removeItem(persistKey);
    });

    it("auto-opens parents when current path is a deep child", async () => {
        // Simulate navigating to a nested lesson path
        setPath("/notes/software-libraries/scripting/basic-patterns/should-process/");

        // Render the LessonTree with persistence enabled
        render(<LessonTree lessons={courseStructure} persistKey={persistKey} />);

        // Expect the active child (deep node) to be visible
        expect(
            await screen.findByText("Ensayo seguro (-WhatIf/-Confirm)"),
        ).toBeInTheDocument();

        // Sibling lesson should also be visible since parent is open
        expect(
            screen.getByText("Recorrer y transformar archivos"),
        ).toBeInTheDocument();

        // Parent section label should be visible (container expanded)
        expect(screen.getByText("Patrones básicos")).toBeInTheDocument();
    });

    it("persists expand/collapse toggles via localStorage when persistKey is provided", async () => {
        // Start from a known lesson path
        setPath("/notes/software-libraries/scripting/basic-patterns/should-process/");

        // Render LessonTree and keep reference for unmounting
        const { unmount } = render(
            <LessonTree lessons={courseStructure} persistKey={persistKey} />,
        );

        // Find the section label element
        const sectionLabel = await screen.findByText("Patrones básicos", {
            selector: "span",
        });

        // Retrieve its closest treeitem container
        // NOTE: `Element.closest()` returns `Element | null`. We cast to `HTMLElement` here because Testing Library's
        // `within()` and the DOM assertion helpers expect an `HTMLElement` (not a generic `Element`). We already
        // awaited `findByText`, so `sectionLabel` is present; the `as HTMLElement` cast makes the tests type-check
        // cleanly under TypeScript while keeping runtime behavior unchanged.
        const containerLi = sectionLabel.closest("[role=\"treeitem\"]") as HTMLElement;

        // Locate the toggle button inside that container
        // NOTE: the trailing `!` is TypeScript's non-null assertion. `getAllByRole` returns an array which may be
        // empty; indexing [0] yields `Element | undefined`. The `!` tells TypeScript we expect a value here (not
        // undefined) at runtime. We use it because the element must exist (we've found the container and it contains a
        // toggle in this UI path). If you prefer stricter checks, use `getAllByRole(...)[0] ?? throw`-style guard or
        // assert presence with `expect(...).toBeDefined()` before clicking.
        const toggleBtn = within(containerLi).getAllByRole("button")[0]!;

        // Collapse the section
        await userEvent.click(toggleBtn);

        // Wait for aria-expanded to reflect the collapsed state
        await waitFor(() => expect(containerLi).toHaveAttribute("aria-expanded", "false"));

        // Verify that its children are no longer rendered
        await waitFor(() =>
            expect(
                screen.queryByText("Ensayo seguro (-WhatIf/-Confirm)"),
            ).not.toBeInTheDocument()
        );

        // Unmount component to simulate a page reload
        unmount();

        // Re-render LessonTree — should restore previous collapsed state from localStorage
        render(<LessonTree lessons={courseStructure} persistKey={persistKey} />);

        // Retrieve the same section again
        const sectionLabel2 = await screen.findByText("Patrones básicos", {
            selector: "span",
        });
        // Same rationale as above: `closest()` can return `Element | null`, but we know the element exists (we awaited
        // it), and Testing Library expects an `HTMLElement` when using `within()` and DOM assertions. Cast for
        // TypeScript.
        const li2 = sectionLabel2.closest("[role=\"treeitem\"]") as HTMLElement;

        // Ensure restored state is still collapsed
        await waitFor(() => expect(li2).toHaveAttribute("aria-expanded", "false"));

        // Verify child is not visible
        await waitFor(() =>
            expect(
                screen.queryByText("Ensayo seguro (-WhatIf/-Confirm)"),
            ).not.toBeInTheDocument()
        );

        // Expand again to confirm toggling still works
        // NOTE: same non-null assertion as above — we expect the toggle button to exist inside the treeitem (otherwise
        // the test setup has gone wrong). The `!` silences the TypeScript undefined check for this test convenience.
        const toggleBtn2 = within(li2).getAllByRole("button")[0]!;
        await userEvent.click(toggleBtn2);

        // Section should be expanded now
        await waitFor(() => expect(li2).toHaveAttribute("aria-expanded", "true"));

        // The previously hidden child should reappear
        expect(
            await screen.findByText("Ensayo seguro (-WhatIf/-Confirm)"),
        ).toBeInTheDocument();
    });
});
