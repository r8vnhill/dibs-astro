/**
 * @file LessonSidebar.test.tsx
 *
 * Test suite for {@link ../LessonSidebar | LessonSidebar.tsx}.
 *
 * This file combines:
 *
 * - Example-based tests (DDT style) for structural and accessibility guarantees.
 * - Property-based testing (PBT) using `fast-check` to validate stability under arbitrary lesson
 *   tree shapes.
 *
 * ## Goals
 *
 * - Ensure the component renders a proper navigation landmark (`<aside>` with
 *   `aria-label="Navegación del curso"`).
 * - Verify that the internal {@link LessonTree} component is rendered.
 * - Assert that the persistence contract (`persistKey="lesson-tree"`) is respected.
 * - Prove that rendering is stable (does not throw) for a wide range of lesson arrays.
 *
 * The `LessonTree` component is mocked to:
 *
 * - Isolate `LessonSidebar` behavior.
 * - Avoid coupling tests to `LessonTree` implementation details.
 * - Capture props for contract verification.
 */

import { render, screen } from "@testing-library/react";
import fc from "fast-check";
import { describe, expect, test, vi } from "vitest";
import type { Lesson } from "~/data/course-structure";
import LessonSidebar from "../LessonSidebar";

/**
 * Spy used to capture props passed to the mocked `LessonTree`.
 *
 * This allows us to verify that `persistKey="lesson-tree"` is consistently provided.
 */
const lessonTreeSpy = vi.fn();

/**
 * Mock of the `LessonTree` component.
 *
 * - Preserves module shape with `__esModule: true`.
 * - Captures incoming props.
 * - Renders a simple test marker for presence assertions.
 */
vi.mock("../LessonTree", () => ({
    __esModule: true,
    LessonTree: (props: { persistKey: string }) => {
        lessonTreeSpy(props);
        return <div data-testid="lesson-tree" />;
    },
}));

describe("LessonSidebar", () => {
    /**
     * Deterministic test:
     *
     * Verifies that:
     * - The sidebar renders as a semantic navigation landmark.
     * - The mocked `LessonTree` is present.
     * - No unrelated UI elements are rendered.
     * - The persistence key contract is respected.
     */
    test("renders the navigation landmark and the lesson tree", () => {
        lessonTreeSpy.mockClear();
        render(<LessonSidebar lessons={[]} />);

        expect(
            screen.getByRole("complementary", { name: "Navegación del curso" }),
        ).toBeInTheDocument();

        expect(screen.getByTestId("lesson-tree")).toBeInTheDocument();

        expect(
            screen.queryByRole("button", { name: "Mostrar navegación" }),
        ).not.toBeInTheDocument();

        expect(lessonTreeSpy).toHaveBeenCalledWith(
            expect.objectContaining({ persistKey: "lesson-tree" }),
        );
    });

    /**
     * Property-based test:
     *
     * For any generated array of `Lesson` objects:
     *
     * - Rendering must not throw.
     * - The navigation landmark must remain present.
     *
     * This guards against regressions when the `Lesson` structure evolves or becomes deeply nested.
     */
    test("property: render stays stable for arbitrary lesson arrays", () => {
        const childLessonArbitrary: fc.Arbitrary<Lesson> = fc.record(
            {
                title: fc.string(),
                href: fc.string(),
            },
            { requiredKeys: ["title"] },
        );

        const lessonArbitrary: fc.Arbitrary<Lesson> = fc.record(
            {
                title: fc.string(),
                href: fc.string(),
                children: fc.array(childLessonArbitrary, { maxLength: 5 }),
            },
            { requiredKeys: ["title"] },
        );

        fc.assert(
            fc.property(
                fc.array(lessonArbitrary, { maxLength: 20 }),
                (lessons) => {
                    const { unmount } = render(
                        <LessonSidebar lessons={lessons} />,
                    );

                    expect(
                        screen.getByRole("complementary", {
                            name: "Navegación del curso",
                        }),
                    ).toBeInTheDocument();

                    unmount();
                },
            ),
        );
    });
});
