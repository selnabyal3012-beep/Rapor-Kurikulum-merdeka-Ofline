import fs from 'fs';
import path from 'path';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

async function run() {
  const outDir = path.resolve('dist-single');

  await build({
    configFile: false,
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'stub-virtual-pwa',
        resolveId(id) {
          if (id === 'virtual:pwa-register') return '\0virtual:pwa-register';
          return null;
        },
        load(id) {
          if (id === '\0virtual:pwa-register') {
            return 'export function registerSW() { return async () => {}; }';
          }
          return null;
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    build: {
      outDir,
      emptyOutDir: true,
      copyPublicDir: false,
      assetsInlineLimit: 100_000_000,
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
          format: 'iife',
          name: 'AplikasiRaporBalil',
        },
      },
    },
  });

  const indexPath = path.join(outDir, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  const assetsDir = path.join(outDir, 'assets');
  const assetFiles = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : [];

  let cssBlock = '';
  let jsBlock = '';

  for (const file of assetFiles) {
    const filePath = path.join(assetsDir, file);
    if (file.endsWith('.css')) {
      const css = fs.readFileSync(filePath, 'utf8').replace(/<\/style/gi, '<\\/style');
      cssBlock += `<style>\n${css}\n</style>\n`;
    } else if (file.endsWith('.js')) {
      const js = fs.readFileSync(filePath, 'utf8').replace(/<\/script/gi, '<\\/script');
      jsBlock += `<script>\n${js}\n</script>\n`;
    }
  }

  // Strip external stylesheet, script tags, and relative icon links from template HTML
  html = html.replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>\s*/gi, '');
  html = html.replace(/<script\b[^>]*src=["'][^"']*["'][^>]*><\/script>\s*/gi, '');
  html = html.replace(/<link\b[^>]*href=["']\.?\/(apple-touch-icon\.png|icon\.svg|icon-192\.png)["'][^>]*>\s*/gi, '');

  // Inline favicon SVG for clean standalone file usage
  const inlineIcon = `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23064e3b'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='32' font-family='sans-serif' font-weight='bold' fill='%23fbbf24'%3ER%3C/text%3E%3C/svg%3E" />\n`;

  // Inject CSS into <head>
  html = html.replace('</head>', () => `${inlineIcon}${cssBlock}</head>`);

  // Inject data slot + IIFE JS bundle AFTER <div id="root"></div> right before </body>
  html = html.replace(
    '</body>',
    () => `<!-- __EMBEDDED_RAPOR_DATA_SLOT__ -->\n${jsBlock}</body>`
  );

  const targetOut = path.resolve('public/aplikasi-rapor-lengkap.html');
  fs.mkdirSync(path.dirname(targetOut), { recursive: true });
  fs.writeFileSync(targetOut, html, 'utf8');

  fs.rmSync(outDir, { recursive: true, force: true });
  console.log('Generated standalone full app HTML:', targetOut, 'bytes:', Buffer.byteLength(html, 'utf8'));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
