/**
 * `<theme-switcher>` custom element: the browser-local behavior behind `ThemeSwitcher.astro`.
 *
 * The element is server-rendered with every option already in the DOM. This module upgrades each
 * instance with disclosure behavior and keeps the rendered selection in sync with the persisted
 * one. It deliberately does not own the first-paint dark-mode decision (that stays in the
 * `BaseLayout` head script); it reads the already-established selection and mutates it on request.
 */
import { applyTheme, getColorSchemeMediaQuery, type Theme, theme } from "~/utils";

const THEME_VALUES: readonly Theme[] = [theme.LIGHT, theme.DARK, theme.AUTO];

const isTheme = (value: string | null): value is Theme =>
    value !== null && (THEME_VALUES as readonly string[]).includes(value);

/**
 * Reads the persisted selection, falling back to the element's `data-default` and finally the
 * shared default. Unknown or absent values never leak past this function.
 */
const readStoredSelection = (fallback: Theme): Theme => {
    try {
        const stored = localStorage.getItem(theme.STORAGE_KEY);
        if (isTheme(stored)) return stored;
    } catch {
        // Access to localStorage can throw (privacy mode, disabled storage); fall through.
    }
    return fallback;
};

class ThemeSwitcherElement extends HTMLElement {
    #selection: Theme = theme.DEFAULT;
    #media: MediaQueryList | null = null;

    #onDocumentPointerDown = (event: Event): void => {
        if (!this.contains(event.target as Node)) this.#closeMenu();
    };

    #onKeyDown = (event: KeyboardEvent): void => {
        if (event.key === "Escape" && this.#isOpen()) {
            this.#closeMenu();
            this.#trigger?.focus();
        }
    };

    #onSystemPreferenceChange = (): void => {
        if (this.#selection === theme.AUTO) applyTheme(theme.AUTO);
    };

    connectedCallback(): void {
        const fallback = isTheme(this.dataset.default ?? null)
            ? (this.dataset.default as Theme)
            : theme.DEFAULT;

        this.#selection = readStoredSelection(fallback);
        this.#syncSelection();

        this.#trigger?.addEventListener("click", this.#toggleMenu);
        for (const option of this.#options) {
            option.addEventListener("click", this.#onOptionClick);
        }

        document.addEventListener("mousedown", this.#onDocumentPointerDown);
        this.addEventListener("keydown", this.#onKeyDown);

        this.#media = getColorSchemeMediaQuery();
        this.#media.addEventListener("change", this.#onSystemPreferenceChange);
    }

    disconnectedCallback(): void {
        this.#trigger?.removeEventListener("click", this.#toggleMenu);
        for (const option of this.#options) {
            option.removeEventListener("click", this.#onOptionClick);
        }

        document.removeEventListener("mousedown", this.#onDocumentPointerDown);
        this.removeEventListener("keydown", this.#onKeyDown);

        this.#media?.removeEventListener("change", this.#onSystemPreferenceChange);
        this.#media = null;
    }

    get #trigger(): HTMLButtonElement | null {
        return this.querySelector<HTMLButtonElement>("[data-theme-trigger]");
    }

    get #menu(): HTMLElement | null {
        return this.querySelector<HTMLElement>("[data-theme-options]");
    }

    get #options(): HTMLButtonElement[] {
        return [...this.querySelectorAll<HTMLButtonElement>("[data-theme-value]")];
    }

    #isOpen(): boolean {
        return this.#menu?.hidden === false;
    }

    #toggleMenu = (): void => {
        if (this.#isOpen()) this.#closeMenu();
        else this.#openMenu();
    };

    #openMenu(): void {
        if (this.#menu) this.#menu.hidden = false;
        this.#trigger?.setAttribute("aria-expanded", "true");
    }

    #closeMenu(): void {
        if (this.#menu) this.#menu.hidden = true;
        this.#trigger?.setAttribute("aria-expanded", "false");
    }

    #onOptionClick = (event: Event): void => {
        const value = (event.currentTarget as HTMLElement).dataset.themeValue;
        if (!isTheme(value ?? null)) return;
        this.#select(value as Theme);
    };

    #select(value: Theme): void {
        this.#selection = value;
        applyTheme(value);
        this.#syncSelection();
        this.#closeMenu();
        this.#trigger?.focus();
    }

    /** Reflects `#selection` into the trigger's current indicator and the options' pressed state. */
    #syncSelection(): void {
        for (const indicator of this.querySelectorAll<HTMLElement>("[data-theme-current]")) {
            indicator.hidden = indicator.dataset.themeCurrent !== this.#selection;
        }
        for (const option of this.#options) {
            const isActive = option.dataset.themeValue === this.#selection;
            option.setAttribute("aria-pressed", String(isActive));
        }
    }
}

if (typeof customElements !== "undefined" && !customElements.get("theme-switcher")) {
    customElements.define("theme-switcher", ThemeSwitcherElement);
}

export { ThemeSwitcherElement };
