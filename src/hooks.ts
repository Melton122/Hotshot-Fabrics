// ============================================
// HOTSHOT FABRICS - CUSTOM HOOKS
// Production Ready | Fixed & Enhanced
// ============================================
import { useEffect } from "react";

// ============================================
// USE OUTSIDE CLICK
// ============================================
export function useOutsideClick(
  ref: React.RefObject<HTMLElement>,
  handler: () => void
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler();
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}