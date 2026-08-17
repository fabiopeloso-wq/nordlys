import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    cssMinify: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      // Zwei Seiten: die Reise selbst und der Proviantplan.
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        proviant: fileURLToPath(new URL('./proviant.html', import.meta.url)),
      },
    },
  },
});
