# Theme model contract

The browser-side theme feature has two distinct concepts. Keeping them separate is what lets the UI show "Automatic"
while the page still renders as light _or_ dark.

## Selection

What the user chose. One of:

```
light | dark | auto
```

Persisted verbatim in `localStorage["theme"]` (`theme.STORAGE_KEY`). Absent or unrecognised values resolve to
`theme.DEFAULT` (`auto`).

## Resolved appearance

Whether the `dark` class is on `<html>`. Pure function of the selection plus the current system preference:

```
dark  iff  selection == dark
      or   selection == auto && prefers-color-scheme: dark
```

This is `resolveDarkMode(selection, prefersDark)` in `theme.ts` — no storage, no DOM, no `matchMedia`.

## Ownership

| Concern                                                                    | Owner                                            |
| -------------------------------------------------------------------------- | ------------------------------------------------ |
| Establish resolved appearance before first paint                           | inline head script in `BaseLayout.astro`         |
| Persist + apply a new selection                                            | `applyTheme` in `theme.ts`                       |
| Display the selection, change it, track the system preference while `auto` | `<theme-switcher>` (`theme-switcher-element.ts`) |

The `<theme-switcher>` element is **not** a first-paint authority: on connect it only synchronises its own UI with the
already-established selection.
