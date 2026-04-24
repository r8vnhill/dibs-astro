export const SITE_ORIGIN = "https://dibs.ravenhill.cl";
export const SCHEMA = "https://schema.org/";
export const DIBS = "https://dibs.ravenhill.cl/vocab#";
export const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

export const ID_PREFIXES = [
    ["https://dibs.ravenhill.cl/bibliography/ref/", "ref:"],
    ["https://dibs.ravenhill.cl/bibliography/person/", "person:"],
    ["https://dibs.ravenhill.cl/bibliography/org/", "org:"],
    ["https://dibs.ravenhill.cl/bibliography/work/", "work:"],
    ["https://dibs.ravenhill.cl/bibliography/usage/", "usage:"],
];

export const ALLOWED_USAGE_TAGS = new Set([
    "recommended",
    "additional",
    "pending-revision",
]);

export const CATEGORY_ORDER = {
    Person: 1,
    Organization: 2,
    CollegeOrUniversity: 2,
    CreativeWork: 3,
    Book: 4,
    WebPage: 4,
    VideoObject: 4,
    ScholarlyArticle: 4,
    Thesis: 4,
    LearningResource: 5,
    "dibs:ReferenceUsage": 6,
};

export const REFERENCE_TYPES = new Set([
    "Book",
    "WebPage",
    "VideoObject",
    "ScholarlyArticle",
    "Thesis",
]);
