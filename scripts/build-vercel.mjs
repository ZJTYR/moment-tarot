import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile, rm, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = path.join(root, '.vercel-build');
const output = path.join(root, 'dist-vercel');
const prepared = spawnSync(process.execPath, [path.join(root, 'scripts/prepare-assets.mjs')], { cwd: root, stdio: 'inherit' });
if (prepared.status !== 0) throw new Error('Pinned MediaPipe asset preparation failed.');

// Vinext beta.5's Node export skips this client page after SSR returns 500.
// Mount the existing client component with Vite; application code stays shared.
await mkdir(temporary, { recursive: true });
try {
  await writeFile(path.join(temporary, 'index.html'), '<!doctype html><html lang="zh-CN" class="dark"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="让选择与直觉相遇。一个可以亲手操纵的沉浸式 3D 塔罗体验。"><title>此刻 · MOMENT</title><link rel="icon" type="image/svg+xml" href="/favicon.svg"></head><body><div id="root"></div><script type="module" src="/entry.jsx"></script></body></html>');
  await writeFile(path.join(temporary, 'entry.jsx'), "import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport TarotExperience from '../src/TarotExperience';\nimport '../app/globals.css';\ncreateRoot(document.getElementById('root')).render(<TarotExperience />);\n");
  await build({
    configFile: false,
    envDir: false,
    root: temporary,
    publicDir: path.join(root, 'public'),
    plugins: [react(), {
      name: 'tarot-static-tailwind-sources',
      enforce: 'pre',
      transform(code, id) {
        if (id !== path.join(root, 'app/globals.css')) return;
        // Compile the same application classes without scanning old build/QA artifacts.
        return code.replace("@import 'tailwindcss';", "@import 'tailwindcss' source(none);") + "\n@source '../src';\n@source '../components';\n@source '../app';\n@source '../lib';\n@source '../hooks';";
      },
    }],
    css: { postcss: { plugins: [tailwindcss()] } },
    resolve: { alias: { '@': root, 'next/image': fileURLToPath(import.meta.resolve('vinext/shims/image')) }, dedupe: ['react', 'react-dom'] },
    // Only public shim constants are injected. Never expose the build environment.
    define: { 'process.env': JSON.stringify({ NODE_ENV: 'production', __VINEXT_IMAGE_UNOPTIMIZED: 'true' }) },
    build: { outDir: output, emptyOutDir: true, sourcemap: false },
  });
} finally {
  await rm(temporary, { recursive: true, force: true });
}

const sha = data => createHash('sha256').update(data).digest('hex');
async function files(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Unexpected output symlink: ${relative}`);
    if (entry.isDirectory()) result.push(...await files(path.join(directory, entry.name), relative));
    else result.push(relative);
  }
  return result;
}
const publicFiles = await files(path.join(root, 'public'));
for (const relative of publicFiles) {
  if (!/\.(?:webp|png|svg|wasm|js|task)$/.test(relative)) throw new Error(`Unexpected public asset: ${relative}`);
  const source = await readFile(path.join(root, 'public', relative));
  if (sha(source) !== sha(await readFile(path.join(output, relative)))) throw new Error(`Asset copy mismatch: ${relative}`);
}
if (publicFiles.filter(file => file.startsWith('art/major-arcana-color/') && file.endsWith('.webp')).length !== 22) throw new Error('The 22 independent card faces are incomplete.');
for (const name of ['goddess', 'angel', 'devil']) for (const suffix of ['', '-back']) await stat(path.join(output, `art/fate-theatre/${name}${suffix}.webp`));
await stat(path.join(output, 'art/zodiac-medallions.webp'));
const model = await readFile(path.join(output, 'mediapipe/gesture_recognizer.task'));
if (sha(model) !== '97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482') throw new Error('Output gesture model checksum mismatch.');
const html = await readFile(path.join(output, 'index.html'), 'utf8');
if (!html.includes('id="root"') || !html.includes('type="module"')) throw new Error('Static client entry is missing.');
for (const match of html.matchAll(/(?:src|href)="(\/[^"?#]+)"/g)) await stat(path.join(output, match[1]));
const outputFiles = await files(output);
let bytes = 0, largest = { path: '', bytes: 0 };
for (const relative of outputFiles) {
  if (!/\.(?:html|js|css|webp|png|svg|wasm|task)$/.test(relative) || relative.split('/').some(segment => segment.startsWith('.'))) throw new Error(`Non-static file in output: ${relative}`);
  const content = await readFile(path.join(output, relative));
  if (/\.(?:html|js|css)$/.test(relative) && (content.toString().includes(root) || /\/Users\/|\/var\/folders\/|\.codex\/worktrees|\.openai\/hosting|sourceMappingURL=/.test(content.toString()))) throw new Error(`Build-only data in output: ${relative}`);
  bytes += content.length;
  if (content.length > largest.bytes) largest = { path: relative, bytes: content.length };
}
console.log(JSON.stringify({ outputDirectory: 'dist-vercel', files: outputFiles.length, bytes, largest, publicAssetsVerified: publicFiles.length, modelSha256: sha(model) }, null, 2));
