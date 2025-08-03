import type { JSX } from "react";
import { X, List } from "phosphor-react";

type ToggleButtonProps = {
  isOpen: boolean;
  toggle: () => void;
};

export function ToggleButton({ isOpen, toggle }: ToggleButtonProps): JSX.Element {
  return (
    <button
      type="button"
      aria-label={isOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
      aria-controls="mainNavMobile"
      aria-expanded={isOpen}
      aria-haspopup="true"
      onClick={toggle}
      className="toggle-button"
    >
      {isOpen ? <X width={24} height={24} /> : <List width={24} height={24} />}
    </button>
  );
}
