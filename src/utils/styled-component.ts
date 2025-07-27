/**
 * Optional `className` prop for extending CSS styling.
 *
 * This interface is useful for components that accept an optional `className` to allow
 * customization via utility classes or CSS modules.
 */
export default interface StyledComponent {
  /**
   * Optional custom CSS class or utility classes to apply to the component.
   */
  className?: string;
}
