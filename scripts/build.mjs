// Bundles src/ into a single self-contained dist/index.html (no runtime network dependency
// except optional Google Fonts). The same bundle can be hosted anywhere as a static page.
import { context, build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';

const watch = process.argv.includes('--watch');

const FONTS =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..600&display=swap';

const escapeScript = (s) => s.replace(/<\/script/gi, '<\\/script');

const inlineHtml = {
  name: 'inline-html',
  setup(b) {
    b.onEnd((result) => {
      if (result.errors.length) return;
      const js = result.outputFiles.find((f) => f.path.endsWith('.js'))?.text ?? '';
      const css = result.outputFiles.find((f) => f.path.endsWith('.css'))?.text ?? '';
      const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Vin-OmicsLab | Computational Biology. From Data to Discovery.</title>
<meta name="description" content="Vin-OmicsLab develops computational approaches that transform complex biological datasets into interpretable, reproducible scientific insight." />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="${FONTS}" />
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script>${escapeScript(js)}</script>
</body>
</html>`;
      mkdirSync('dist', { recursive: true });
      writeFileSync('dist/index.html', html);
      console.log(`dist/index.html  ${(html.length / 1024).toFixed(0)} KB`);
    });
  },
};

const options = {
  entryPoints: ['src/main.tsx'],
  bundle: true,
  write: false,
  outdir: 'dist/assets',
  format: 'iife',
  target: 'es2020',
  jsx: 'automatic',
  minify: !watch,
  sourcemap: false,
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': watch ? '"development"' : '"production"' },
  loader: { '.css': 'css' },
  plugins: [inlineHtml],
  logLevel: 'info',
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log('watching src/ ...');
} else {
  await build(options);
}
