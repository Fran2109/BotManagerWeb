import { Capacitor } from '@capacitor/core';

// Replaces react-native-dotenv's `@env` module (aliased in vite.config.ts).
// Values come from .env with the VITE_ prefix and are inlined at build time.
const env = import.meta.env;

// In the browser dev server, Control Room calls go through the Vite proxy to avoid CORS.
// Kept absolute: Functions.ts also sets axios.defaults.baseURL, which would be prepended
// again to a relative URL.
const useDevProxy = env.DEV && !Capacitor.isNativePlatform();
const devProxyUrl = (prefix: string) => `${window.location.origin}/${prefix}/`;

export const AA_COMMUNITY_URL: string = useDevProxy ? devProxyUrl('aa1') : env.VITE_AA_COMMUNITY_URL;
export const AA_COMMUNITY2_URL: string = useDevProxy ? devProxyUrl('aa2') : env.VITE_AA_COMMUNITY2_URL;
export const DEFAULT_PASSWORD: string = env.VITE_DEFAULT_PASSWORD;
export const USER_FRANCISCO1: string = env.VITE_USER_FRANCISCO1;
export const USER_FRANCISCO3: string = env.VITE_USER_FRANCISCO3;
export const USER_FRANCISCO4: string = env.VITE_USER_FRANCISCO4;
export const CALLBACK_URL: string = env.VITE_CALLBACK_URL;
