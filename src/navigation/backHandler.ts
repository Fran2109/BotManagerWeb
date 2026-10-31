import { useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Toast } from '@capacitor/toast';

// Replacement for React Native's BackHandler. Handlers form a stack: the most
// recently registered one runs first; returning true stops propagation.
type Handler = () => boolean;

const handlers: { current: Handler }[] = [];

export const useBackHandler = (handler: Handler, enabled = true) => {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const entry = { current: () => ref.current() };
    handlers.push(entry);
    return () => {
      const i = handlers.indexOf(entry);
      if (i >= 0) handlers.splice(i, 1);
    };
  }, [enabled]);
};

let backPressedOnce = false;
let backPressTimeout: ReturnType<typeof setTimeout> | null = null;

/** Wires the Android hardware back button. Call once at startup. */
export const installBackButton = () => {
  if (!Capacitor.isNativePlatform()) return;

  CapacitorApp.addListener('backButton', () => {
    for (let i = handlers.length - 1; i >= 0; i--) {
      if (handlers[i].current()) return;
    }

    // Nothing handled it: press back twice within 2s to exit.
    if (backPressedOnce) {
      if (backPressTimeout) clearTimeout(backPressTimeout);
      CapacitorApp.exitApp();
      return;
    }
    backPressedOnce = true;
    Toast.show({ text: 'Press back again to exit', duration: 'short' });
    backPressTimeout = setTimeout(() => {
      backPressedOnce = false;
      backPressTimeout = null;
    }, 2000);
  });
};
