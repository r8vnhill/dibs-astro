/**
 * @file Deprecated compatibility wrapper for navigation normalization.
 *
 * This module exists only to preserve older imports while navigation normalization is moved behind the 
 * presentation layer. New code should import from `$presentation/adapters/navigation-normalization` directly.
 *
 * Do not add behavior here. This file must remain a thin re-export of the presentation-owned implementation so there 
 * is a single source of truth for navigation shaping.
 *
 * ## Maintainer notes:
 *
 * - do not add new normalization helpers to this module;
 * - do not use this import path in new code;
 * - migrate existing callers to `$presentation/adapters/navigation-normalization`;
 * - remove this wrapper once no callers depend on it.
 *
 * @deprecated Import from `$presentation/adapters/navigation-normalization` instead.
 */
export {
    type NavigationLinkInput,
    normalizeNavigation,
    normalizeNavigationLink,
    normalizePreviousNavigation,
} from "$presentation/adapters/navigation-normalization";
