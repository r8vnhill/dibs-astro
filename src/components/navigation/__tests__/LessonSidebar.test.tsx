import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { LessonSidebar } from "../LessonSidebar";

vi.mock("../LessonTree", () => ({
    LessonTree: () => <div data-testid="lesson-tree" />,
}));

describe("LessonSidebar", () => {
    test("renders a visible sidebar panel", () => {
        render(<LessonSidebar lessons={[]} />);

        expect(screen.getByTestId("lesson-sidebar-panel")).toBeInTheDocument();
        expect(screen.getByTestId("lesson-tree")).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Mostrar navegación" }),
        ).not.toBeInTheDocument();
    });
});
