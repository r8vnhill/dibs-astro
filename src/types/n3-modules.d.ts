/**
 * Type declarations for the n3 RDF/Turtle library.
 * n3 does not provide official TypeScript types, so we declare the essential types here.
 */

declare module "n3" {
    /**
     * Base interface for RDF terms (URIs, literals, blank nodes, etc.)
     */
    export interface Term {
        termType: "NamedNode" | "Literal" | "BlankNode" | "Variable" | "Quad";
        value: string;
        equals?(other: Term): boolean;
    }

    /**
     * RDF Literal (string, number, boolean, or other typed values)
     */
    export interface Literal extends Term {
        termType: "Literal";
        value: string;
        language?: string;
        datatype?: NamedNode;
    }

    /**
     * RDF Named Node (URI/IRI resource)
     */
    export interface NamedNode extends Term {
        termType: "NamedNode";
        value: string;
    }

    /**
     * RDF Blank Node (anonymous resource)
     */
    export interface BlankNode extends Term {
        termType: "BlankNode";
        value: string;
    }

    /**
     * RDF Variable (used in SPARQL patterns)
     */
    export interface Variable extends Term {
        termType: "Variable";
        value: string;
    }

    /**
     * RDF Quad (subject, predicate, object, graph)
     */
    export interface Quad {
        subject: Term;
        predicate: NamedNode;
        object: Term;
        graph?: NamedNode;
    }

    /**
     * Parser for Turtle and other RDF formats
     */
    export class Parser {
        constructor(options?: Record<string, any>);
        parse(text: string): Quad[];
    }

    /**
     * Store for RDF quads
     */
    export class Store {
        constructor(quads?: Quad[]);
        addQuad(quad: Quad): this;
        addQuads(quads: Quad[]): this;
        addTriple(subject: Term, predicate: NamedNode, object: Term): this;
        getQuads(
            subject?: Term,
            predicate?: NamedNode,
            object?: Term,
            graph?: NamedNode,
        ): Quad[];
        size: number;
    }

    /**
     * Factory for creating RDF terms
     */
    export const namedNode: (value: string) => NamedNode;
    export const literal: (value: string, languageOrDatatype?: string | NamedNode) => Literal;
    export const blankNode: (value?: string) => BlankNode;
    export const variable: (value: string) => Variable;
    export const defaultGraph: () => NamedNode;
    export const quad: (
        subject: Term,
        predicate: NamedNode,
        object: Term,
        graph?: NamedNode,
    ) => Quad;

    /**
     * Writer for serializing RDF to Turtle format
     */
    export class Writer {
        constructor(options?: Record<string, any>);
        addQuad(quad: Quad): this;
        addQuads(quads: Quad[]): this;
        end(callback?: (error: Error | null, result?: string) => void): void;
    }
}
