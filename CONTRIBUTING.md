# 🤝 Contributing

This repository is part of a teaching resource and is not meant for production. That said, issues and improvements are
welcome!

## How to Contribute

1. [Open an issue](https://gitlab.com/r8vnhill/dibs-astro/-/issues) to suggest improvements or report errors.
2. Follow the [Code of Conduct](./CODE_OF_CONDUCT.md).
3. Fork this repo and submit a pull request.

## Code formatting: dprint

We use dprint to keep the codebase consistently formatted across contributors and editors. Please format any changed files with dprint before opening a pull request.

- Install dprint: https://dprint.dev/#/installation
- Format changed files locally:

```pwsh
# install once (recommended)
pnpm add -g dprint

# run formatter from repo root
dprint fmt
```

Tips:

- If your editor supports it, enable an on-save dprint integration (most editors support a dprint plugin or call the CLI).
- Consider adding a pre-commit hook to run `dprint fmt` on staged files (tools like `husky` or `lefthook` work well).

If you prefer not to install dprint globally, run `pnpm dlx dprint fmt` or `npx dprint fmt` instead.

## Pre-commit hooks (Husky + lint-staged)

This repo uses Husky with lint-staged to automatically format only staged files with dprint on each commit.

- Installation: Hooks are set up automatically via the `prepare` script when you run `pnpm install`.
- What the hook does: Runs `pnpm dlx lint-staged`, which invokes `dprint fmt` for the staged files.
- Run manually: You can test the hook with `pnpm dlx lint-staged`.
- Skip temporarily: Use `git commit --no-verify` (not recommended; only for emergencies).
- Troubleshooting: If hooks don’t run, execute `pnpm run prepare` to (re)install Husky.

Recommended: For large repos, formatting only staged files keeps commits quick. Our lint-staged config lives in `package.json` under the `lint-staged` key.
