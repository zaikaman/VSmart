'use client';

import { useEffect } from 'react';

export interface HotkeyDefinition {
  key: string;
  action: (event: KeyboardEvent) => void;
  enabled?: boolean;
}

export function useHotkeys(definitions: HotkeyDefinition[]) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.getAttribute('contenteditable') === 'true');

      for (const item of definitions) {
        if (item.enabled === false) {
          continue;
        }

        if (event.key.toLowerCase() === item.key.toLowerCase()) {
          if (isTypingTarget && item.key !== 'Escape') {
            continue;
          }
          item.action(event);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [definitions]);
}
