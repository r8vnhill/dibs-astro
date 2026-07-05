# License and attribution files

## Purpose

This directory documents the licensing and attribution status of third-party assets bundled with this package. It does
not license the package code, and it does not introduce new legal or provenance conclusions beyond what is already
recorded in `third-party-icons.json`.

## Files

- **`../LICENSE`** — covers the package code only. It does not cover bundled icon assets.
- **`PHOSPHOR.txt`** — the MIT license text for the Phosphor icon corpus, with the recorded copyright notice
  `Copyright (c) 2020-2024 Phosphor Icons`.
- **`THIRD_PARTY.md`** — a generated notice file, produced from `third-party-icons.json`. Do not hand-edit it;
  regenerate it from the manifest instead.
- **`third-party-icons.json`** — the frozen manifest recording per-asset licensing evidence and release decisions. It is
  the source of truth for `THIRD_PARTY.md`.

The package code and the icon assets are tracked separately. The package code is licensed through `../LICENSE`;
third-party icon assets and related attribution are documented through the files in this directory.

## Excluded non-Phosphor assets

The nine non-Phosphor custom assets recorded in the manifest are currently excluded from packaging. No additional
per-asset license files exist for them at this time.

## Trademark notice

These notices document copyright licensing only. They do not imply endorsement, sponsorship, or trademark permission.
Trademark names and logos referenced in this directory remain the property of their respective owners.

## Maintenance workflow

To update licensing or attribution information, update `third-party-icons.json` first, then regenerate `THIRD_PARTY.md`
from it. Do not edit `THIRD_PARTY.md` directly.
