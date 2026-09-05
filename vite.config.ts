import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig, type PluginOption } from 'vite';

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

export default defineConfig(async () => {
  const plugins: PluginOption[] = [vinext()];
  const { readFile } = await import('node:fs/promises');
  let hosting: { d1: string | null; r2: string | null } | undefined;
  try { hosting = JSON.parse(await readFile(new URL('./.openai/hosting.json', import.meta.url), 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  if (hosting) {
    // Preserve the existing local/Sites build. Static hosting needs neither
    // Cloudflare bindings nor the local Sites project metadata.
    process.env.WRANGLER_WRITE_LOGS ??= 'false';
    process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
    process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';
    const { d1, r2 } = hosting;
    const { sites } = await import('@openai/sites-vite-plugin');
    const { cloudflare } = await import('@cloudflare/vite-plugin');
    plugins.push(sites(), cloudflare({
      viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
      config: {
        main: 'vinext/server/fetch-handler',
        compatibility_flags: ['nodejs_compat'],
        d1_databases: d1 ? [{ binding: d1, database_name: 'site-creator-d1', database_id: '00000000-0000-4000-8000-000000000000' }] : [],
        r2_buckets: r2 ? [{ binding: r2, bucket_name: 'site-creator-r2' }] : [],
      },
    }));
  }
  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    server: isCodexSeatbeltSandbox ? { watch: { useFsEvents: false, usePolling: true } } : undefined,
    plugins,
  };
});
