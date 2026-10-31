/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_PASSWORD: string;
  readonly VITE_AA_COMMUNITY_URL: string;
  readonly VITE_AA_COMMUNITY2_URL: string;
  readonly VITE_USER_FRANCISCO1: string;
  readonly VITE_USER_FRANCISCO3: string;
  readonly VITE_USER_FRANCISCO4: string;
  readonly VITE_CALLBACK_URL: string;
  /** "1" only in end-to-end test builds (see main.tsx). */
  readonly VITE_E2E?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
