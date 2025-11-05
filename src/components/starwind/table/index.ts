import Table from "./Table.astro";
import TableBody from "./TableBody.astro";
import TableCaption from "./TableCaption.astro";
import TableCell from "./TableCell.astro";
import TableFoot from "./TableFoot.astro";
import TableHead from "./TableHead.astro";
import TableHeader from "./TableHeader.astro";
import TableRow from "./TableRow.astro";

export type { TableProps } from "./Table.astro";
export type { TableBodyProps } from "./TableBody.astro";
export type { TableCaptionProps } from "./TableCaption.astro";
export type { TableCellProps } from "./TableCell.astro";
export type { TableFootProps } from "./TableFoot.astro";
export type { TableHeadCellProps } from "./TableHead.astro";
export type { TableHeaderProps } from "./TableHeader.astro";
export type { TableRowProps } from "./TableRow.astro";

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFoot,
  TableHead,
  TableHeader,
  TableRow,
};

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
