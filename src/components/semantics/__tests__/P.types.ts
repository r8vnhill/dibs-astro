import type { ComponentProps } from "astro/types";
import P from "../P.astro";

type ParagraphProps = ComponentProps<typeof P>;

const validParagraph: ParagraphProps = {
    id: "powerslave-summary",
    lang: "en",
    dir: "ltr",
    "aria-label": "Project summary",
    "data-project": "powerslave",
};

void validParagraph;

// @ts-expect-error Unknown attributes must not be accepted by the paragraph contract.
const invalidParagraph: ParagraphProps = { notAParagraphProp: "invalid" };

void invalidParagraph;
