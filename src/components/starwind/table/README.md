# Starwind Table Components

A small, composable table kit built with Astro + Tailwind Variants. It provides thin wrappers around semantic table tags with consistent styling, strong typing, and a few practical affordances like density control and header sorting.

- Components: `Table`, `TableHeader`, `TableHead`, `TableBody`, `TableRow`, `TableCell`, `TableFoot`, `TableCaption`
- Helpers: variant builders in `table-variants.ts`, and `buildTableHeadState()` for testing header behaviors.

## Quick Start

```astro
---
import {
    TableBody,
    TableCaption,
    TableCell,
    TableFoot,
    TableHead,
    TableHeader,
    TableRow,
} from "~/components/starwind/table";
import Table from "~/components/starwind/table/Table.astro";
---

<Table
    layout="fixed" border="subtle"
    density="comfortable"
>
    <TableCaption tone="muted">Feature matrix (Q4)</TableCaption>

    <TableHeader sticky elevated>
        <tr>
            <TableHead
                scope="col" align="left"
                size="sm"
            >Feature</TableHead>
            <TableHead
                scope="col" align="center"
                size="sm" sort="asc"
            >Adoption</TableHead>
            <TableHead
                scope="col" align="right"
                size="sm"
            >Owner</TableHead>
        </tr>
    </TableHeader>

    <TableBody zebra="even">
        <TableRow>
            <TableCell>Authentication</TableCell>
            <TableCell align="center">92%</TableCell>
            <TableCell align="right">Core</TableCell>
        </TableRow>
        <TableRow>
            <TableCell>Audit log</TableCell>
            <TableCell align="center">68%</TableCell>
            <TableCell align="right">Platform</TableCell>
        </TableRow>
    </TableBody>

    <TableFoot>
        <tr>
            <TableCell align="right" colSpan={3}>2 items</TableCell>
        </tr>
    </TableFoot>
</Table>
```

## Component APIs

### `Table.astro`

- Variants
  - `layout`: `auto | fixed` (default `auto`)
  - `border`: `standard | subtle | none` (default `standard`)
  - `density`: `compact | comfortable | spacious` (default `comfortable`)
- Behavior
  - Wraps the table in a horizontal scroll container by default.
  - Props: `scrollContainer?: boolean`, `scrollContainerClass?: string`, `scrollContainerProps?: HTMLAttributes<'div'>`.
  - Emits `data-table` and `data-table-density` on the `<table>`.

### `TableHeader.astro`

- Variants: `sticky?: boolean`, `elevated?: boolean`
- Applies section-level background and typography to header rows.

### `TableHead.astro`

- Variants: `align`, `size`, `wrap` (see cell variants below)
- Props
  - `scope?: 'col' | 'row'` (default `col`)
  - `sort?: 'none' | 'asc' | 'desc'` – sets `aria-sort` and `data-sort`, appends an icon by default
  - `sortLabel?: string` – custom screen-reader label for sorted state
  - `showSortIcon?: boolean` – toggle the inline glyph

### `TableBody.astro`

- Variants: `zebra: 'none' | 'even' | 'odd'`

### `TableRow.astro`

- Variants
  - `intent: 'default' | 'clickable' | 'highlight'`
  - `hoverable?: boolean` (default `true`)
  - `density: 'compact' | 'comfortable' | 'spacious'` – overrides the table-level density when needed
- Notes
  - Accepts `data-state="selected"` for a selected-row background.
  - Row/cell padding is driven by CSS variables set at the table level.

### `TableCell.astro`

- Variants
  - `align: 'left' | 'center' | 'right'` (default `left`)
  - `tone: 'default' | 'muted' | 'accent'`
  - `size: 'sm' | 'md' | 'lg'` (default `md`)
  - `wrap: 'nowrap' | 'normal'` (default `nowrap`)

### `TableFoot.astro`

- Variants: `muted?: boolean` (default `true`)

### `TableCaption.astro`

- Variants: `align: 'left' | 'center' | 'right'` (default `center`), `tone: 'default' | 'muted' | 'emphasis'` (default `muted`)

## Patterns and Recipes

### Sticky, Sortable Header

```astro
<Table>
    <TableHeader sticky elevated>
        <tr>
            <TableHead scope="col">Name</TableHead>
            <TableHead scope="col" sort="asc">Updated</TableHead>
            <TableHead scope="col">Status</TableHead>
        </tr>
    </TableHeader>
    <TableBody>{/* rows... */}</TableBody>
</Table>
```

### Zebra Striping

```astro
<Table>
    <TableBody zebra="odd">
        <TableRow>...</TableRow>
    </TableBody>
</Table>
```

### Density Cascade

```astro
<Table density="compact">
    <TableBody>
        <TableRow>...</TableRow>
    </TableBody>
</Table>
```

You can still override per-row: `<TableRow density="spacious" />`.

### Wrapping Content

```astro
<Table>
    <TableBody>
        <TableRow>
            <TableCell wrap="normal">
                Long description that should wrap rather than force horizontal scroll.
            </TableCell>
            <TableCell align="right">42</TableCell>
        </TableRow>
    </TableBody>
</Table>
```

## Accessibility

- Use `<TableCaption>` for a short, descriptive caption.
- Header cells default `scope` to `col`. For row headers, pass `scope="row"`.
- When a column is sorted, `TableHead sort` sets `aria-sort` and inserts screen-reader-only text. You can customize the label with `sortLabel`.

## Testing

- Prefer testing the shared class builders directly. For example:

```ts
import { tableDataCell, tableHeaderSection } from "~/components/starwind/table/table-variants";

expect(tableHeaderSection({ sticky: true })).toContain("[&_th]:sticky");
expect(tableDataCell({ align: "center", tone: "muted" })).toContain("text-center");
```

- For header semantics, use the logic helper without rendering Astro:

```ts
import { buildTableHeadState } from "~/components/starwind/table/table-head-logic";

const s = buildTableHeadState({ sort: "desc" });
expect(s.isSorted).toBe(true);
expect(s.ariaSort).toBe("desc");
```

## Data Attributes

All components emit `data-table-*` attributes (e.g., `data-table`, `data-table-header`, `data-table-head`, `data-table-body`, `data-table-row`, `data-table-foot`, `data-table-caption`). These are handy for targeted tests and UI hooks without over-coupling to class names.

## Imports

You can import individually, or via the index for convenience:

```ts
import {
    TableBody,
    TableCaption,
    TableCell,
    TableFoot,
    TableHead,
    TableHeader,
    TableRow,
} from "~/components/starwind/table";
import Table from "~/components/starwind/table/Table.astro";
// or default object with slots
import TableKit from "~/components/starwind/table";
// <TableKit.Root> <TableKit.Header> ...
```

### Disable Scroll Container

```astro
<Table scrollContainer={false}>
    <TableHeader>...</TableHeader>
    <TableBody>...</TableBody>
</Table>
```
