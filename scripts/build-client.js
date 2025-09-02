// scripts/build-client.js
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

(async () => {
  const projectRoot = path.resolve(__dirname, '..');
  const srcClient = path.join(projectRoot, 'src', 'client');
  const outDir = path.join(projectRoot, 'public', 'dist');

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // find entry points (e.g., all *.ts files in src/client root)
  // adjust as you need (subdirs, globs, etc.)
  const entries = fs.readdirSync(srcClient)
    .filter(f => f.endsWith('.ts'))
    .map(f => path.join(srcClient, f));
  console.log('Entry points found:', entries);

  try {
    await esbuild.build({
      entryPoints: entries,
      bundle: true,
      outdir: outDir,
      sourcemap: true,
      minify: true,
      format: 'iife',
      target: ['es2018'],
      define: { 'process.env.NODE_ENV': '"production"' }
    });
    console.log('Client build complete ->', outDir);
  } catch (err) {
    console.error('Client build failed:', err);
    process.exit(1);
  }
})();
