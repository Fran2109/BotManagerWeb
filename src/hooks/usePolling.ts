import { useEffect, useRef } from 'react';

/**
 * Calls `onTick(false)` once, then `onTick(true)` (silent) every `intervalMs` while the
 * app is visible. Polling stops in the background (saving battery and mobile data) and
 * a silent refresh runs as soon as the app comes back.
 */
export const usePolling = (onTick: (silent: boolean) => void, intervalMs: number) => {
  const tick = useRef(onTick);
  tick.current = onTick;

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      timer = setInterval(() => tick.current(true), intervalMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        tick.current(true);
        start();
      }
    };

    tick.current(false);
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs]);
};
