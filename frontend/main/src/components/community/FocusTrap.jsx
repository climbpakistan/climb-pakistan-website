import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * FocusTrap — reusable keyboard-accessibility wrapper for modal dialogs.
 *
 * - On mount: remembers the element that opened the dialog and moves focus to
 *   the first interactive element inside it.
 * - While open: Tab / Shift+Tab cycle only through elements inside the trap,
 *   so focus never escapes behind the modal.
 * - On unmount: restores focus to the element that opened the dialog.
 *
 * Escape handling is intentionally left to each dialog's existing UX so an
 * Escape key doesn't accidentally dismiss confirmations.
 *
 * Renders its children unchanged; pass a ref created by the parent (attached
 * to the dialog element) via `containerRef`.
 */
export default function FocusTrap({ children, containerRef }) {
  const restoreRef = useRef(null);

  useEffect(() => {
    restoreRef.current = document.activeElement;

    const focusable = () => {
      if (!containerRef.current) return [];
      return [...containerRef.current.querySelectorAll(FOCUSABLE_SELECTOR)]
        .filter((el) => el.getClientRects().length > 0);
    };

    focusable()[0]?.focus();

    const onKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      const list = focusable();
      if (list.length === 0) return;
      const idx = list.indexOf(document.activeElement);
      if (e.shiftKey) {
        if (idx <= 0) {
          e.preventDefault();
          list[list.length - 1].focus();
        }
      } else if (idx === -1 || idx === list.length - 1) {
        e.preventDefault();
        list[0].focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const restore = restoreRef.current;
      if (restore && typeof restore.focus === 'function') restore.focus();
    };
  }, [containerRef]);

  return children;
}