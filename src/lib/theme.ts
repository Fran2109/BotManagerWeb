import { useSyncExternalStore } from 'react';
import { Capacitor, SystemBars, SystemBarsStyle, SystemBarType } from '@capacitor/core';

/**
 * Light/dark appearance. "system" follows the phone; light/dark set data-theme on <html>,
 * which index.css uses to pick the token set. index.html applies the saved choice before
 * the first paint so there's no flash.
 */
export type ThemePreference = 'system' | 'light' | 'dark';

const KEY = 'theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set<() => void>();

const read = (): ThemePreference => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
};

let preference = read();

export const isDark = () => preference === 'dark' || (preference === 'system' && media.matches);

const apply = () => {
  const root = document.documentElement;
  if (preference === 'system') root.removeAttribute('data-theme');
  else root.dataset.theme = preference;
  const dark = isDark();
  // Browser chrome and the Android task switcher use the page color.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0f1012' : '#f3f4f6');
  if (Capacitor.isNativePlatform()) {
    // The header is graphite in both themes, so the status bar keeps light icons; the
    // navigation bar sits over the page and follows the theme.
    void SystemBars.setStyle({ style: SystemBarsStyle.Dark, bar: SystemBarType.StatusBar }).catch(() => {});
    void SystemBars.setStyle({
      style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
      bar: SystemBarType.NavigationBar,
    }).catch(() => {});
  }
  listeners.forEach(l => l());
};

export const setThemePreference = (next: ThemePreference) => {
  preference = next;
  try {
    if (next === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, next);
  } catch {
    // Storage unavailable: the choice lasts until the app closes.
  }
  apply();
};

media.addEventListener('change', () => preference === 'system' && apply());

export const initTheme = apply;

export const useThemePreference = () =>
  useSyncExternalStore(
    cb => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => preference,
  );
