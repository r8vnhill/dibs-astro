/**
 * HeadEvidence — a semantic projection of rendered `<head>` output.
 *
 * Milestone 1 characterization helper. It parses rendered HTML into a structural
 * projection so that consumer migrations can be compared by semantic identity
 * rather than by incidental whitespace or Astro-generated formatting.
 *
 * The projection deliberately separates:
 *
 * - `title`, `charset`, `canonical` — singular document basics;
 * - `meta` — every `name`/`property`/`http-equiv` tag, keyed and kept in
 *   document order so repeated keys (multiple authors, multiple creators) are
 *   preserved;
 * - `links` — every non-canonical `<link>`, in document order, so operationally
 *   meaningful sequences such as `preconnect → stylesheet` remain observable;
 * - `jsonLd` — parsed `application/ld+json` blocks, in document order.
 *
 * SYNCED COPY — canonical source: `@ravenhill/astro-head` `tests/helpers/head-evidence.ts`.
 * Do not edit here; change it upstream and re-copy so VerSo, DIBS, and the
 * package share one projection contract.
 */
import { load } from "cheerio";

/** A single non-canonical `<link>` reduced to its operationally relevant attributes. */
export interface HeadLinkEvidence {
    rel: string;
    href: string | undefined;
    type?: string;
    crossorigin?: string;
}

/** Structural projection of a rendered `<head>`. */
export interface HeadEvidence {
    /** `<title>` text, or `undefined` when absent or empty. */
    title: string | undefined;

    /** `<meta charset>` value, or `undefined` when absent. */
    charset: string | undefined;

    /**
     * `<meta>` tags keyed by `name:<x>`, `property:<x>` or `http-equiv:<x>`.
     * Values are `content` strings in document order; a key repeats its values
     * so multi-author citation and Dublin Core tags stay distinguishable.
     */
    meta: Record<string, string[]>;

    /** `<link rel="canonical">` href, or `undefined` when absent. */
    canonical: string | undefined;

    /** Every other `<link>`, in document order. */
    links: HeadLinkEvidence[];

    /** Parsed `application/ld+json` payloads, in document order. */
    jsonLd: unknown[];
}

/** Minimal structural view of the cheerio element wrapper used by {@link projectHead}. */
interface AttrReader {
    attr(name: string): string | undefined;
}

function metaKey($el: AttrReader): string | undefined {
    const name = $el.attr("name");
    if (name !== undefined) return `name:${name}`;
    const property = $el.attr("property");
    if (property !== undefined) return `property:${property}`;
    const httpEquiv = $el.attr("http-equiv");
    if (httpEquiv !== undefined) return `http-equiv:${httpEquiv}`;
    return undefined;
}

/** Parses rendered HTML into a {@link HeadEvidence} projection. */
export function projectHead(html: string): HeadEvidence {
    const $ = load(html);

    let charset: string | undefined;
    const meta: Record<string, string[]> = {};
    $("meta").each((_, el) => {
        const $el = $(el);
        const charsetAttr = $el.attr("charset");
        if (charsetAttr !== undefined) {
            charset = charsetAttr;
            return;
        }
        const key = metaKey($el);
        if (key === undefined) return;
        (meta[key] ??= []).push($el.attr("content") ?? "");
    });

    let canonical: string | undefined;
    const links: HeadLinkEvidence[] = [];
    $("link").each((_, el) => {
        const $el = $(el);
        const rel = ($el.attr("rel") ?? "").trim();
        const href = $el.attr("href");
        if (rel === "canonical") {
            canonical = href;
            return;
        }
        const type = $el.attr("type");
        const crossorigin = $el.attr("crossorigin");
        links.push({
            rel,
            href,
            ...(type !== undefined ? { type } : {}),
            ...(crossorigin !== undefined ? { crossorigin } : {}),
        });
    });

    const jsonLd: unknown[] = [];
    $("script[type='application/ld+json']").each((_, el) => {
        const raw = $(el).text().trim();
        if (!raw) return;
        try {
            jsonLd.push(JSON.parse(raw));
        } catch {
            jsonLd.push({ __unparsed__: raw });
        }
    });

    const title = $("title").first().text();

    return {
        title: title === "" ? undefined : title,
        charset,
        meta,
        canonical,
        links,
        jsonLd,
    };
}
