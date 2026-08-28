/** Content and frontmatter metadata retained by DIBS. */
export interface PageMetaAuthor {
    name: string;
    url?: string;
}

export interface PageMetaChange {
    date: string;
    author: string;
    subject: string;
    hash: string;
}

/** Site-facing content metadata mapped by the DIBS head adapter. */
export interface PageMeta {
    type?: "website" | "article";
    canonicalUrl?: string;
    authors?: PageMetaAuthor[];
    lastModified?: string;
    changes?: PageMetaChange[];
    language?: string;
}
