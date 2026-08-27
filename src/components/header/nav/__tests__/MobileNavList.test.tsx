import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, suite, test } from "vitest";
import { MobileNavList } from "../MobileNavList";

const items = [{ id: "home", href: "/", label: "Inicio" }];

afterEach(cleanup);

suite("given an open DIBS mobile navigation", () => {
    test("then it provides menu content without creating a nested navigation landmark", () => {
        render(<MobileNavList isOpen items={items} />);

        expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
        expect(screen.getByRole("list")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Inicio" })).toBeInTheDocument();
    });
});

suite("given a closed DIBS mobile navigation", () => {
    test("then it removes the mobile links from the document", () => {
        render(<MobileNavList isOpen={false} items={items} />);

        expect(screen.queryByRole("link", { name: "Inicio" })).not.toBeInTheDocument();
    });
});
