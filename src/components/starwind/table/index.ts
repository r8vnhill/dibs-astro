/**
 * Barrel export for Starwind table components.
 *
 * Provides two import patterns for lesson pages to render data tables with semantic HTML
 * (`<table>`, `<thead>`, `<tbody>`, etc.):
 * 1. Named imports for composition:
 *    ```ts
 *    import {
 *      Table, TableHeader, TableBody, TableRow, TableCell
 *    } from "~/components/starwind/table"
 *    ```
 * 2. Legacy object syntax (default export): `Table.Root`, `Table.Header`, `Table.Body`,
 *    `Table.Row`, `Table.Cell`
 *
 * Used across lesson pages (scripting, type-fundamentals) to display parameter lists, data
 * comparisons, and function signatures.
 */

import Table from "./Table.astro";
import TableBody from "./TableBody.astro";
import TableCaption from "./TableCaption.astro";
import TableCell from "./TableCell.astro";
import TableFoot from "./TableFoot.astro";
import TableHead from "./TableHead.astro";
import TableHeader from "./TableHeader.astro";
import TableRow from "./TableRow.astro";

export { Table, TableBody, TableCaption, TableCell, TableFoot, TableHead, TableHeader, TableRow };

export default {
    Root: Table,
    Body: TableBody,
    Caption: TableCaption,
    Cell: TableCell,
    Foot: TableFoot,
    Head: TableHead,
    Header: TableHeader,
    Row: TableRow,
};
