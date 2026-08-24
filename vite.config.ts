import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { existsSync, readdirSync } from 'node:fs';

const page = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

// Logbuch-Tagesseiten werden von scripts/gen-log-pages.mjs erzeugt (logbuch/tag-NN/index.html)
const logPages = existsSync(page('./logbuch'))
  ? Object.fromEntries(
      readdirSync(page('./logbuch'))
        .filter((d) => /^tag-\d\d$/.test(d) && existsSync(page(`./logbuch/${d}/index.html`)))
        .map((d) => [`log-${d}`, page(`./logbuch/${d}/index.html`)])
    )
  : {};

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    cssMinify: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      // Die Reise, der Proviantplan, das Logbuch (Übersicht + ein HTML pro Tag).
      input: {
        main: page('./index.html'),
        proviant: page('./proviant.html'),
        logbuch: page('./logbuch.html'),
        ...logPages,
      },
    },
  },
});
