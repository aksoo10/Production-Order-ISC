import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, 'dist');
const rootDir = path.resolve(__dirname, '..');
const distHtml = path.resolve(distDir, 'index.html');
const rootHtml = path.resolve(rootDir, 'index.html');
const distAssets = path.resolve(distDir, 'assets');
const rootAssets = path.resolve(rootDir, 'assets');

if (fs.existsSync(distHtml)) {
  fs.copyFileSync(distHtml, rootHtml);
  console.log('[sync-build] Copied dist/index.html -> ../index.html');
}

if (fs.existsSync(distAssets)) {
  if (!fs.existsSync(rootAssets)) {
    fs.mkdirSync(rootAssets, { recursive: true });
  }
  const files = fs.readdirSync(distAssets);
  for (const f of files) {
    fs.copyFileSync(path.resolve(distAssets, f), path.resolve(rootAssets, f));
  }
  console.log(`[sync-build] Synced ${files.length} asset files -> ../assets/`);
}
