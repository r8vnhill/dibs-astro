import { AstroComponentFactory } from "~/types/astro-component";
import { HeadingLevel } from "~/utils";

export interface BaseCalloutProps {
  title?: string;
  icon?: AstroComponentFactory | null;
  headingLevel?: Exclude<HeadingLevel, "h1">;
  headingId?: string;
  class?: string;
  headingClass?: string;
  iconClass?: string;
  ariaLabel?: string;
  compact?: boolean;
  prose?: boolean;
}
