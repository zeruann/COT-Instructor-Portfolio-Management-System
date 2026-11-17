import { useEffect, useState } from 'react';

/**
 * Keeps a modal mounted briefly after `isOpen` becomes false so exit animations can play.
 */
export function useAnimatedModal(isOpen, duration = 180) {
  const [rendered, setRendered] = useState(Boolean(isOpen));
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      setClosing(false);
      return undefined;
    }
    if (!rendered) return undefined;
    setClosing(true);
    const timer = setTimeout(() => {
      setRendered(false);
      setClosing(false);
    }, duration);
    return () => clearTimeout(timer);
  }, [isOpen, rendered, duration]);

  return {
    rendered,
    closing,
    backdropAnim: closing
      ? 'animate-[modalBackdropOut_150ms_ease-in_forwards]'
      : 'animate-[modalBackdropIn_150ms_ease-out_forwards]',
    panelAnim: closing
      ? 'animate-[modalPanelOut_150ms_ease-in_forwards]'
      : 'animate-[modalPanelIn_180ms_cubic-bezier(0.16,1,0.3,1)_forwards]',
  };
}

