import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json';

/**
 * The production CSP is intentionally strict. During `vite` development React
 * Refresh needs an inline bootstrap script, and HMR needs a websocket, so the
 * dev server gets a slightly relaxed copy of the same policy.
 */
function devCsp(): Plugin {
  return {
    name: 'cinevra-dev-csp',
    apply: 'serve',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html
          .replace(
            "script-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          )
          .replace(
            "connect-src 'self' https://api.themoviedb.org",
            "connect-src 'self' https://api.themoviedb.org https://integrate.api.nvidia.com ws://localhost:5199 http://localhost:5199",
          );
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), devCsp()],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: { port: 5199, strictPort: true },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'chrome128',
  },
});
