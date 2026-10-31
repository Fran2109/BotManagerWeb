import { createRoot } from 'react-dom/client';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import './index.css';
import App from './App';
import { installBackButton } from './navigation/backHandler';

installBackButton();

// <input type="checkbox" switch> is native only in Safari; the Android WebView needs the
// polyfill. It is vendored in public/ because it fetches its CSS relative to its own URL,
// and loaded with a script tag because Vite refuses import() of public/ files.
const markSwitchReady = () => document.documentElement.classList.add('switch-ready');
if ('switch' in HTMLInputElement.prototype) {
  markSwitchReady();
} else {
  const script = document.createElement('script');
  script.type = 'module';
  script.src = `${import.meta.env.BASE_URL}vendor/input-switch-polyfill/input-switch-polyfill.js`;
  script.onload = script.onerror = markSwitchReady;
  document.head.append(script);
}

// End-to-end test hook, only in builds made with VITE_E2E=1 (stripped otherwise): lets a
// test follow an existing deployment without launching a bot.
if (import.meta.env.VITE_E2E === '1') {
  void import('./lib/runTracker').then(m => {
    (window as unknown as { __e2e: unknown }).__e2e = { trackRun: m.trackRun };
  });
}

// No StrictMode: its double-invoked effects would fire duplicate logins and polling,
// which the React Native app never did.
createRoot(document.getElementById('root')!).render(<App />);
