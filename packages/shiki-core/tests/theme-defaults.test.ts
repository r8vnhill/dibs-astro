import { describe, expect, it } from "vitest";
import {
    DEFAULT_DARK_THEME,
    DEFAULT_LIGHT_THEME,
    SHIKI_DEFAULT_THEMES,
} from "../src/themes/defaults";

/**
 * Contract tests for theme defaults.
 *
 * These tests verify the stable export of default theme values.
 */
describe("theme defaults", () => {
    describe("DEFAULT_LIGHT_THEME", () => {
        it("is a non-empty string", () => {
            expect(typeof DEFAULT_LIGHT_THEME).toBe("string");
            expect(DEFAULT_LIGHT_THEME.length).toBeGreaterThan(0);
        });

        it("equals the expected default", () => {
            expect(DEFAULT_LIGHT_THEME).toBe("catppuccin-latte");
        });

        it("is a valid Shiki theme name", () => {
            expect(DEFAULT_LIGHT_THEME).toMatch(/^[a-z0-9-]+$/);
        });
    });

    describe("DEFAULT_DARK_THEME", () => {
        it("is a non-empty string", () => {
            expect(typeof DEFAULT_DARK_THEME).toBe("string");
            expect(DEFAULT_DARK_THEME.length).toBeGreaterThan(0);
        });

        it("equals the expected default", () => {
            expect(DEFAULT_DARK_THEME).toBe("catppuccin-mocha");
        });

        it("is a valid Shiki theme name", () => {
            expect(DEFAULT_DARK_THEME).toMatch(/^[a-z0-9-]+$/);
        });

        it("differs from light theme", () => {
            expect(DEFAULT_DARK_THEME).not.toBe(DEFAULT_LIGHT_THEME);
        });
    });

    describe("SHIKI_DEFAULT_THEMES (backwards compatibility)", () => {
        it("is an object with light and dark properties", () => {
            expect(typeof SHIKI_DEFAULT_THEMES).toBe("object");
            expect(SHIKI_DEFAULT_THEMES).toHaveProperty("light");
            expect(SHIKI_DEFAULT_THEMES).toHaveProperty("dark");
        });

        it("contains the canonical theme values", () => {
            expect(SHIKI_DEFAULT_THEMES.light).toBe(DEFAULT_LIGHT_THEME);
            expect(SHIKI_DEFAULT_THEMES.dark).toBe(DEFAULT_DARK_THEME);
        });

        it("is immutable (readonly)", () => {
            // TypeScript ensures this at compile time; runtime check is best-effort
            expect(Object.isFrozen(SHIKI_DEFAULT_THEMES) || !Object.isExtensible(SHIKI_DEFAULT_THEMES)).toBe(true);
        });

        it("matches expected theme pair", () => {
            expect(SHIKI_DEFAULT_THEMES).toEqual({
                light: "catppuccin-latte",
                dark: "catppuccin-mocha",
            });
        });
    });
});
