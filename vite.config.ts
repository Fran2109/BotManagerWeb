import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// The Control Room APIs don't send CORS headers, so in the browser dev server
// requests go through these proxies (see src/env.ts). On Android, CapacitorHttp
// performs the requests natively and the real URLs are used.
const proxyFor = (prefix: string, url: string | undefined) => {
  if (!url) return {};
  const target = new URL(url);
  return {
    [prefix]: {
      target: target.origin,
      changeOrigin: true,
      secure: true,
      rewrite: (path: string) => path.replace(new RegExp(`^${prefix}/?`), target.pathname),
    },
  };
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@env': fileURLToPath(new URL('./src/env.ts', import.meta.url)),
      },
    },
    server: {
      host: true,
      proxy: {
        ...proxyFor('/aa1', env.VITE_AA_COMMUNITY_URL),
        ...proxyFor('/aa2', env.VITE_AA_COMMUNITY2_URL),
      },
    },
  };
});
