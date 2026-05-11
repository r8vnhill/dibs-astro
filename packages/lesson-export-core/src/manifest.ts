import type { LessonExportFinding } from "./findings";

export type LessonRoute = string;
export type ExportRoute = string;
export type PdfOutputPath = string;
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
