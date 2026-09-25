import { afterEach, beforeEach, expect, suite, test } from "vitest";
import "~/utils/theme-switcher-element";

/**
 * In-memory `localStorage`. The jsdom instance used here is created without a storage-backed URL,
 * so `localStorage` is absent; the theme model only needs a spec-shaped `getItem`/`setItem`.
 */
function installLocalStorage(): void {
    const store = new Map<string, string>();
    const mock: Storage = {
        get length() {
            return store.size;
        },
        clear: () => store.clear(),
        getItem: (key) => (store.has(key) ? store.get(key)! : null),
        key: (index) => [...store.keys()][index] ?? null,
        removeItem: (key) => void store.delete(key),
        setItem: (key, value) => void store.set(key, String(value)),
    };
    Object.defineProperty(globalThis, "localStorage", { value: mock, configurable: true });
}

/**
 * Controllable `matchMedia` stub. jsdom does not implement `matchMedia`, and these tests need to
 * flip the system preference and fire `change` on demand.
 */
type FakeMediaQueryList = MediaQueryList & { setMatches(next: boolean): void };

function installMatchMedia(initialMatches = false): FakeMediaQueryList {
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    let matches = initialMatches;

    const mql = {
        media: "(prefers-color-scheme: dark)",
        get matches() {
            return matches;
        },
        addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
            listeners.add(listener);
        },
        removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
            listeners.delete(listener);
        },
        addListener: () => {},
        removeListener: () => {},
        onchange: null,
        dispatchEvent: () => true,
        setMatches(next: boolean) {
            matches = next;
            const event = { matches: next, media: mql.media } as MediaQueryListEvent;
            for (const listener of listeners) listener(event);
        },
    } as unknown as FakeMediaQueryList;

    window.matchMedia = (() => mql) as typeof window.matchMedia;
    return mql;
}

const FIXTURE = `
<theme-switcher data-default="auto">
  <button
    data-theme-trigger type="button"
    aria-haspopup="true" aria-expanded="false" aria-controls="theme-switcher-options"
  >
    <span class="sr-only">Tema actual:</span>
    <span data-theme-current="light" hidden>Claro</span>
    <span data-theme-current="dark" hidden>Oscuro</span>
    <span data-theme-current="auto">Auto</span>
  </button>
  <ul id="theme-switcher-options" data-theme-options hidden>
    <li><button type="button" data-theme-value="light" aria-pressed="false">Claro</button></li>
    <li><button type="button" data-theme-value="dark" aria-pressed="false">Oscuro</button></li>
    <li><button type="button" data-theme-value="auto" aria-pressed="true">Auto</button></li>
  </ul>
</theme-switcher>`;

type Handles = {
    root: HTMLElement;
    trigger: HTMLButtonElement;
    menu: HTMLElement;
    option(value: string): HTMLButtonElement;
    currentVisible(): string | undefined;
    pressed(): string | undefined;
};

function mount(): Handles {
    document.body.innerHTML = FIXTURE;
    const root = document.body.querySelector("theme-switcher") as HTMLElement;
    return {
        root,
        trigger: root.querySelector("[data-theme-trigger]") as HTMLButtonElement,
        menu: root.querySelector("[data-theme-options]") as HTMLElement,
        option: (value) => root.querySelector(`[data-theme-value="${value}"]`) as HTMLButtonElement,
        currentVisible: () =>
            [...root.querySelectorAll<HTMLElement>("[data-theme-current]")]
                .find((el) => !el.hidden)?.dataset.themeCurrent,
        pressed: () =>
            [...root.querySelectorAll<HTMLButtonElement>("[data-theme-value]")]
                .find((el) => el.getAttribute("aria-pressed") === "true")?.dataset.themeValue,
    };
}

beforeEach(() => {
    installLocalStorage();
    installMatchMedia(false);
    document.documentElement.classList.remove("dark");
});

afterEach(() => {
    document.body.innerHTML = "";
});

suite("given a connected <theme-switcher> with no stored preference", () => {
    test("then it presents the shared default selection", () => {
        const ui = mount();

        expect(ui.currentVisible()).toBe("auto");
        expect(ui.pressed()).toBe("auto");
    });

    test("then it does not act as a second first-paint authority for the dark class", () => {
        installMatchMedia(true);
        mount();

        expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    test("then it renders exactly the three theme options", () => {
        const ui = mount();

        expect([...ui.root.querySelectorAll("[data-theme-value]")].map((el) => (el as HTMLElement).dataset.themeValue))
            .toEqual(["light", "dark", "auto"]);
    });
});

suite("given a stored preference", () => {
    test("when it is 'light' then the light option is shown and pressed", () => {
        localStorage.setItem("theme", "light");
        const ui = mount();

        expect(ui.currentVisible()).toBe("light");
        expect(ui.pressed()).toBe("light");
    });

    test("when it is 'dark' then the dark option is shown and pressed", () => {
        localStorage.setItem("theme", "dark");
        const ui = mount();

        expect(ui.currentVisible()).toBe("dark");
        expect(ui.pressed()).toBe("dark");
    });

    test("when it is unknown then it falls back to the default", () => {
        localStorage.setItem("theme", "sepia");
        const ui = mount();

        expect(ui.currentVisible()).toBe("auto");
    });
});

suite("given the user picks a theme", () => {
    test("then selection, persistence, dark class, pressed state and the menu all update", () => {
        const ui = mount();
        ui.trigger.click();
        ui.option("dark").click();

        expect(localStorage.getItem("theme")).toBe("dark");
        expect(document.documentElement.classList.contains("dark")).toBe(true);
        expect(ui.currentVisible()).toBe("dark");
        expect(ui.pressed()).toBe("dark");
        expect(ui.menu.hidden).toBe(true);
        expect(ui.trigger.getAttribute("aria-expanded")).toBe("false");
    });

    test("when switching back to 'light' then the dark class is removed", () => {
        const ui = mount();
        ui.option("dark").click();
        ui.option("light").click();

        expect(localStorage.getItem("theme")).toBe("light");
        expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    test("when picking 'auto' under a dark system preference then the dark class is applied", () => {
        installMatchMedia(true);
        const ui = mount();
        ui.option("auto").click();

        expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
});

suite("given the system color scheme changes", () => {
    test("when 'auto' is selected then the page follows the new preference", () => {
        const media = installMatchMedia(false);
        const ui = mount();
        ui.option("auto").click();

        media.setMatches(true);
        expect(document.documentElement.classList.contains("dark")).toBe(true);

        media.setMatches(false);
        expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    test("when a fixed theme is selected then the preference change is ignored", () => {
        const media = installMatchMedia(false);
        const ui = mount();
        ui.option("light").click();

        media.setMatches(true);
        expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
});

suite("given the disclosure interaction", () => {
    test("then the trigger opens and closes the menu", () => {
        const ui = mount();

        ui.trigger.click();
        expect(ui.menu.hidden).toBe(false);
        expect(ui.trigger.getAttribute("aria-expanded")).toBe("true");

        ui.trigger.click();
        expect(ui.menu.hidden).toBe(true);
        expect(ui.trigger.getAttribute("aria-expanded")).toBe("false");
    });

    test("then a pointer press outside the element closes the menu", () => {
        const ui = mount();
        ui.trigger.click();

        document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        expect(ui.menu.hidden).toBe(true);
    });

    test("then a pointer press inside the element keeps the menu open", () => {
        const ui = mount();
        ui.trigger.click();

        ui.menu.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        expect(ui.menu.hidden).toBe(false);
    });

    test("then Escape closes the menu", () => {
        const ui = mount();
        ui.trigger.click();

        ui.root.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        expect(ui.menu.hidden).toBe(true);
    });
});

suite("given the element is removed from the document", () => {
    test("then it stops responding to system preference changes", () => {
        const media = installMatchMedia(false);
        const ui = mount();
        ui.option("auto").click();

        ui.root.remove();
        media.setMatches(true);

        expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
});
