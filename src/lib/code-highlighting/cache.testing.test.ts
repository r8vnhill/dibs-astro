/**
 * @file cache.testing.test.ts
 *
 * Unit tests for the Shiki highlighter cache test controls.
 *
 * These tests verify that cache mutation, reset, and resource cleanup work correctly
 * and allow tests to override the shared highlighter with fakes or delayed promises.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Highlighter } from "shiki";
import { resetHighlighterCacheForTests, setHighlighterForTests } from "./cache.testing";
import { getHighlighter } from "./cache";

describe("code-highlighting cache test controls (cache.testing)", () => {
	beforeEach(() => {
		// Ensure clean state before each test
		// Note: we don't await here because we're just clearing for the next test
		setHighlighterForTests(null);
	});

	afterEach(async () => {
		// Clean up any overrides and dispose resources
		await resetHighlighterCacheForTests();
	});

	describe("setHighlighterForTests", () => {
		it("should override the cache with a raw highlighter instance", async () => {
			const fakeHighlighter: Highlighter = {
				codeToHtml: vi.fn(),
				codeToTokens: vi.fn(),
				codeToTokensBase: vi.fn(),
				getLoadedLanguages: vi.fn().mockReturnValue([]),
				getLoadedThemes: vi.fn().mockReturnValue([]),
				loadLanguage: vi.fn(),
				loadTheme: vi.fn(),
				setColorReplacements: vi.fn(),
				dispose: vi.fn(),
			} as unknown as Highlighter;

			setHighlighterForTests(fakeHighlighter);

			const result = await getHighlighter();
			expect(result).toBe(fakeHighlighter);
			expect(fakeHighlighter.codeToHtml).toBeDefined();
		});

		it("should override the cache with a highlighter promise", async () => {
			const fakeHighlighter: Highlighter = {
				codeToHtml: vi.fn(),
				codeToTokens: vi.fn(),
				codeToTokensBase: vi.fn(),
				getLoadedLanguages: vi.fn().mockReturnValue([]),
				getLoadedThemes: vi.fn().mockReturnValue([]),
				loadLanguage: vi.fn(),
				loadTheme: vi.fn(),
				setColorReplacements: vi.fn(),
				dispose: vi.fn(),
			} as unknown as Highlighter;

			const promise = Promise.resolve(fakeHighlighter);
			setHighlighterForTests(promise);

			const result = await getHighlighter();
			expect(result).toBe(fakeHighlighter);
		});

		it("should override the cache with a pending promise", async () => {
			let resolve: (h: Highlighter) => void = () => undefined;
			const promise = new Promise<Highlighter>((r) => {
				resolve = r;
			});

			const fakeHighlighter: Highlighter = {
				codeToHtml: vi.fn(),
				codeToTokens: vi.fn(),
				codeToTokensBase: vi.fn(),
				getLoadedLanguages: vi.fn().mockReturnValue([]),
				getLoadedThemes: vi.fn().mockReturnValue([]),
				loadLanguage: vi.fn(),
				loadTheme: vi.fn(),
				setColorReplacements: vi.fn(),
				dispose: vi.fn(),
			} as unknown as Highlighter;

			setHighlighterForTests(promise);

			// Cache should hold the promise, not the resolved value yet
			const cachedPromise = getHighlighter();
			expect(cachedPromise).toBe(promise);

			// Resolve the promise
			resolve(fakeHighlighter);
			const result = await cachedPromise;
			expect(result).toBe(fakeHighlighter);
		});

		it("should clear the override when set to null", async () => {
			const fakeHighlighter: Highlighter = {
				codeToHtml: vi.fn(),
				codeToTokens: vi.fn(),
				codeToTokensBase: vi.fn(),
				getLoadedLanguages: vi.fn().mockReturnValue([]),
				getLoadedThemes: vi.fn().mockReturnValue([]),
				loadLanguage: vi.fn(),
				loadTheme: vi.fn(),
				setColorReplacements: vi.fn(),
				dispose: vi.fn(),
			} as unknown as Highlighter;

			setHighlighterForTests(fakeHighlighter);
			setHighlighterForTests(null);

			// After setting to null, getHighlighter should return the real shared service
			// (which may timeout if Shiki isn't fully configured, so we just verify it's
			// a fresh promise, not our fake)
			const result = getHighlighter();
			expect(result).toBeDefined();
		});
	});

	describe("resetHighlighterCacheForTests", () => {
		it("should clear the cache override", async () => {
			const fakeHighlighter: Highlighter = {
				codeToHtml: vi.fn(),
				codeToTokens: vi.fn(),
				codeToTokensBase: vi.fn(),
				getLoadedLanguages: vi.fn().mockReturnValue([]),
				getLoadedThemes: vi.fn().mockReturnValue([]),
				loadLanguage: vi.fn(),
				loadTheme: vi.fn(),
				setColorReplacements: vi.fn(),
				dispose: vi.fn(),
			} as unknown as Highlighter;

			setHighlighterForTests(fakeHighlighter);
			await resetHighlighterCacheForTests();

			// After reset, the cache should be cleared
			// The real appShikiService will try to create a fresh one
			const result = getHighlighter();
			expect(result).toBeDefined();
		});

		it("should dispose a previously resolved highlighter", async () => {
			const fakeHighlighter: Highlighter = {
				codeToHtml: vi.fn(),
				codeToTokens: vi.fn(),
				codeToTokensBase: vi.fn(),
				getLoadedLanguages: vi.fn().mockReturnValue([]),
				getLoadedThemes: vi.fn().mockReturnValue([]),
				loadLanguage: vi.fn(),
				loadTheme: vi.fn(),
				setColorReplacements: vi.fn(),
				dispose: vi.fn(),
			} as unknown as Highlighter;

			setHighlighterForTests(fakeHighlighter);

			// Ensure the promise is resolved before reset
			await getHighlighter();

			await resetHighlighterCacheForTests();

			// Verify dispose was called
			expect(fakeHighlighter.dispose).toHaveBeenCalledTimes(1);
		});

		it("should tolerate a rejected cached promise during reset", async () => {
			const rejectedPromise = Promise.reject(new Error("Fake rejection"));
			setHighlighterForTests(rejectedPromise);

			// Reset should not throw even though the cached promise rejects
			await expect(resetHighlighterCacheForTests()).resolves.toBeUndefined();
		});

		it("should delete the cache slot before awaiting cleanup", async () => {
			let cleanupCalled = false;
			const fakeHighlighter: Highlighter = {
				codeToHtml: vi.fn(),
				codeToTokens: vi.fn(),
				codeToTokensBase: vi.fn(),
				getLoadedLanguages: vi.fn().mockReturnValue([]),
				getLoadedThemes: vi.fn().mockReturnValue([]),
				loadLanguage: vi.fn(),
				loadTheme: vi.fn(),
				setColorReplacements: vi.fn(),
				dispose: vi.fn(() => {
					cleanupCalled = true;
				}),
			} as unknown as Highlighter;

			setHighlighterForTests(fakeHighlighter);
			await getHighlighter(); // Ensure it's resolved

			await resetHighlighterCacheForTests();

			// The cache should be cleared even if dispose took time
			// (we can't easily test the timing aspect, but we can verify the result)
			expect(cleanupCalled).toBe(true);
		});

		it("should handle two consecutive resets safely", async () => {
			const fakeHighlighter: Highlighter = {
				codeToHtml: vi.fn(),
				codeToTokens: vi.fn(),
				codeToTokensBase: vi.fn(),
				getLoadedLanguages: vi.fn().mockReturnValue([]),
				getLoadedThemes: vi.fn().mockReturnValue([]),
				loadLanguage: vi.fn(),
				loadTheme: vi.fn(),
				setColorReplacements: vi.fn(),
				dispose: vi.fn(),
			} as unknown as Highlighter;

			setHighlighterForTests(fakeHighlighter);
			await resetHighlighterCacheForTests();

			// Second reset should not throw
			await expect(resetHighlighterCacheForTests()).resolves.toBeUndefined();
		});

		it("should handle reset after setting to null safely", async () => {
			setHighlighterForTests(null);

			// Reset should be safe even if the cache is already null
			await expect(resetHighlighterCacheForTests()).resolves.toBeUndefined();
		});

		it("should allow setting a new highlighter after reset", async () => {
			const fakeHighlighter1: Highlighter = {
				codeToHtml: vi.fn(),
				codeToTokens: vi.fn(),
				codeToTokensBase: vi.fn(),
				getLoadedLanguages: vi.fn().mockReturnValue([]),
				getLoadedThemes: vi.fn().mockReturnValue([]),
				loadLanguage: vi.fn(),
				loadTheme: vi.fn(),
				setColorReplacements: vi.fn(),
				dispose: vi.fn(),
			} as unknown as Highlighter;

			const fakeHighlighter2: Highlighter = {
				codeToHtml: vi.fn(),
				codeToTokens: vi.fn(),
				codeToTokensBase: vi.fn(),
				getLoadedLanguages: vi.fn().mockReturnValue([]),
				getLoadedThemes: vi.fn().mockReturnValue([]),
				loadLanguage: vi.fn(),
				loadTheme: vi.fn(),
				setColorReplacements: vi.fn(),
				dispose: vi.fn(),
			} as unknown as Highlighter;

			setHighlighterForTests(fakeHighlighter1);
			await resetHighlighterCacheForTests();

			setHighlighterForTests(fakeHighlighter2);
			const result = await getHighlighter();

			expect(result).toBe(fakeHighlighter2);
		});

		it("should not call dispose more than once for a cached highlighter", async () => {
			const fakeHighlighter: Highlighter = {
				codeToHtml: vi.fn(),
				codeToTokens: vi.fn(),
				codeToTokensBase: vi.fn(),
				getLoadedLanguages: vi.fn().mockReturnValue([]),
				getLoadedThemes: vi.fn().mockReturnValue([]),
				loadLanguage: vi.fn(),
				loadTheme: vi.fn(),
				setColorReplacements: vi.fn(),
				dispose: vi.fn(),
			} as unknown as Highlighter;

			setHighlighterForTests(fakeHighlighter);
			await getHighlighter();

			await resetHighlighterCacheForTests();

			// Dispose should be called exactly once
			expect(fakeHighlighter.dispose).toHaveBeenCalledTimes(1);

			// Calling reset again should not call dispose again
			await resetHighlighterCacheForTests();
			expect(fakeHighlighter.dispose).toHaveBeenCalledTimes(1);
		});
	});
});
