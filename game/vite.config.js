import { defineConfig } from 'vite';

export default defineConfig({
  base: '/game/',
  plugins: [],
  server: { host: '0.0.0.0', port: 8000 },
  clearScreen: false,
  build: {
    outDir: '../public/game',
    emptyOutDir: true,
    assetsDir: 'assets',
    target: 'esnext',
    // 🚫 no rollupOptions.input here!
  }
});


