import { defineConfig } from 'vite';

export default defineConfig({
  base: '/game/',
  plugins: [],
  // strictPort: the site's dev server proxies /game/* to this exact port, so
  // silently falling back to 8001 when 8000 is busy would break local dev in a
  // confusing way (the iframe would 502). Fail loudly instead.
  server: { host: '0.0.0.0', port: 8000, strictPort: true },
  clearScreen: false,
  publicDir: false,
  build: {
    outDir: '../public/game',
    emptyOutDir: true,
    assetsDir: 'assets',
    target: 'esnext',
    // 🚫 no rollupOptions.input here!
  }
});


