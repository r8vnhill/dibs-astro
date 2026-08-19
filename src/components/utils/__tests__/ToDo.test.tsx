import { getPlaceholderImagePool } from "$presentation/adapters/static-ui-data";
import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, expect, suite, test, vi } from "vitest";
import ToDo from "../ToDo";

vi.mock("$presentation/adapters/static-ui-data", () => ({
    getPlaceholderImagePool: vi.fn(),
}));

const DEFAULT_MESSAGE = "TODO: Estamos (estoy) trabajando para ustedes c:";
const PLACEHOLDER_WARNING = "⚠️ [ToDo]: This component is a placeholder. Replace it with real content.";

const imagePool = ["/images/todo/first.jpg", "/images/todo/second.jpg"];

type ToDoProps = ComponentProps<typeof ToDo>;

beforeEach(() => {
    vi.mocked(getPlaceholderImagePool).mockReturnValue(imagePool);
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

suite("given the existing ToDo React component", () => {
    test("then it renders the default message in a figure caption", () => {
        render(<ToDo />);

        const figure = screen.getByRole("figure");

        expect(figure).toHaveAttribute("aria-describedby");
        expect(figure.querySelector("figcaption")).toHaveTextContent(
            `${DEFAULT_MESSAGE}Esta sección podría estar incompleta :0`,
        );
    });

    test("then it renders a custom message and alternative text", () => {
        render(<ToDo message="Contenido pendiente" altText="Meme de ejemplo" />);

        expect(screen.getByRole("figure")).toHaveTextContent(
            "Contenido pendienteEsta sección podría estar incompleta :0",
        );
        expect(screen.getByRole("img")).toHaveAttribute(
            "alt",
            "Meme de ejemplo",
        );
    });

    test("then it selects an image from the placeholder image pool", () => {
        render(<ToDo />);

        expect(imagePool).toContain(screen.getByRole("img").getAttribute("src"));
    });

    test("then it renders the fallback when the image pool is empty", () => {
        vi.mocked(getPlaceholderImagePool).mockReturnValue([]);

        render(<ToDo />);

        expect(screen.getByText("⚠️ Imagen no disponible")).toBeInTheDocument();
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });

    test.each(
        [
            ["omitted", {}],
            ["undefined", { reportEventName: undefined }],
        ] satisfies ReadonlyArray<[string, ToDoProps]>,
    )(
        "then %s reportEventName dispatches dibs:placeholder",
        (_caseName, props) => {
            const listener = vi.fn();
            window.addEventListener("dibs:placeholder", listener);

            render(<ToDo {...props} />);

            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener.mock.calls[0]?.[0]).toBeInstanceOf(CustomEvent);

            window.removeEventListener("dibs:placeholder", listener);
        },
    );

    test("then a custom reportEventName dispatches the custom event", () => {
        const listener = vi.fn();
        const metadata = { tasks: ["write tests"] };
        window.addEventListener("todo:custom", listener);

        render(
            <ToDo
                message="Contenido pendiente"
                metadata={metadata}
                reportEventName="todo:custom"
            />,
        );

        expect(listener).toHaveBeenCalledTimes(1);
        const event = listener.mock.calls[0]?.[0] as CustomEvent;
        expect(event.detail).toMatchObject({
            message: "Contenido pendiente",
            imageSrc: expect.stringMatching(/^\/images\/todo\//),
            metadata,
        });
        expect(new Date(event.detail.timestamp).toString()).not.toBe("Invalid Date");

        window.removeEventListener("todo:custom", listener);
    });

    test("then null reportEventName disables event dispatch", () => {
        const listener = vi.fn();
        window.addEventListener("dibs:placeholder", listener);

        render(<ToDo reportEventName={null} />);

        expect(listener).not.toHaveBeenCalled();

        window.removeEventListener("dibs:placeholder", listener);
    });

    test("then it reports once per component mount and warns with metadata", () => {
        const listener = vi.fn();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const metadata = { title: "Pending lesson" };
        window.addEventListener("dibs:placeholder", listener);

        const { unmount } = render(<ToDo metadata={metadata} />);

        expect(listener).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledWith(PLACEHOLDER_WARNING, metadata);

        unmount();
        expect(listener).toHaveBeenCalledTimes(1);

        window.removeEventListener("dibs:placeholder", listener);
        warn.mockRestore();
    });
});
