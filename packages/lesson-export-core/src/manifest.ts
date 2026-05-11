import type { LessonExportFinding } from "./findings";

declare const lessonRouteBrand: unique symbol;
declare const exportRouteBrand: unique symbol;
declare const pdfOutputPathBrand: unique symbol;

export type LessonRoute = string & {
    readonly [lessonRouteBrand]: "LessonRoute";
};
export type ExportRoute = string & {
    readonly [exportRouteBrand]: "ExportRoute";
};
export type PdfOutputPath = string & {
    readonly [pdfOutputPathBrand]: "PdfOutputPath";
};
export type IsoDateTime = string;

export interface LessonExportEntry {
    readonly route: LessonRoute;
    readonly exportRoute: ExportRoute;
    readonly title: string;
    readonly sourceFile: string;
    readonly outputPath: PdfOutputPath;
    readonly lastModified?: IsoDateTime;
    readonly authors?: readonly string[];
    readonly findings?: readonly LessonExportFinding[];
}

export interface LessonExportManifest {
    readonly generatedAt: IsoDateTime;
    readonly entries: readonly LessonExportEntry[];
}
