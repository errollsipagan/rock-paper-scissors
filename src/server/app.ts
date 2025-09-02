import express from 'express';
import path from 'path';
import fs from 'fs';
import { build } from 'esbuild';

const app = express();
const ROOT = path.resolve(__dirname, '../../'); // project root when running compiled server in dist
const SRC_CLIENT = path.join(ROOT, 'src', 'client');
const PUBLIC = path.join(ROOT, 'public');

const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.get('/', (req, res) => {
  const htmlPath = path.join(PUBLIC, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    return res.status(500).send('index.html not found');
  }

  let html = fs.readFileSync(htmlPath, 'utf-8');

  const scriptFile = isProd ? '/dist/script.js' : '/script.ts';
  html = html.replace(/%SCRIPT_FILE%/g, scriptFile);

  res.send(html);
});
/**
 * Development middleware: transpile .ts browser files on request using esbuild.
 * Expects URLs like /static/main.ts  -> resolves to src/client/main.ts
 */
if (!isProd) {
  // simple cache: key -> { code, mtimeMs }
  const cache = new Map<string, { code: string; mtimeMs: number }>();

  // app.use(async (req, res, next) => {
  app.get('/:filename.ts', async (req, res) => {
    try {
      // map url path to src/client file (you can customize mapping)
      // Only allow files under src/client for safety
      const urlPath = decodeURIComponent(`/${req.params.filename}.ts`);
      console.log(urlPath);
      
      // strip leading slash
      const requested = urlPath.replace(/^\//, '');
      // Resolve candidate file in src/client
      const candidate = path.join(SRC_CLIENT, requested);
      console.log('candidate', candidate);
      

      // Prevent path traversal
      if (!candidate.startsWith(SRC_CLIENT)) {
        return res.status(400).send('Invalid module path');
      }
      console.log('Building', candidate);
      

      if (!fs.existsSync(candidate)) {
        return res.status(404).send('Not found');
      }

      const stat = fs.statSync(candidate);
      const cached = cache.get(candidate);

      if (cached && cached.mtimeMs === stat.mtimeMs) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        return res.send(cached.code);
      }

      // build with esbuild (bundle so imports work; format iife so script tag works)
      const result = await build({
        entryPoints: [candidate],
        bundle: true,
        write: false,
        sourcemap: 'inline',
        format: 'iife',
        platform: 'browser',
        target: ['es2020']
      });

      const output = result.outputFiles && result.outputFiles[0];
      if (!output) {
        return res.status(500).send('Build produced no output');
      }

      const js = output.text;
      cache.set(candidate, { code: js, mtimeMs: stat.mtimeMs });

      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.send(js);
    } catch (err) {
      console.error('Dev build error:', err);
      res.status(500).send('Build error: ' + String(err));
    }
  });

  // Serve static files from public during dev
  app.use(express.static(PUBLIC));
} else {
  // Production: serve pre-built client assets from public folder
  app.use(express.static(PUBLIC, { maxAge: '1y', etag: false }));
  // Also serve index.html for SPA-style or root
}

app.listen(PORT, () => {
  console.log(`Server running ${isProd ? 'in production' : 'in dev'} on http://localhost:${PORT}`);
});
