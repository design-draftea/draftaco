import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

const basePath = '/draftaco'

const i18nModulePrefix = '@draftaco/i18n'

// `@vitejs/plugin-react` injeta o runtime JSX de `jsxImportSource` em
// `optimizeDeps.include`, e include vence exclude. Como o nosso runtime é código-fonte
// (alias para `src/shared/i18n`), o pré-bundle acabava inlineando todo o grafo dele,
// inclusive o catálogo de textos da Draftea. O cache de deps não invalida com mudança de
// fonte, então editar `src/brands/draftea/legacyCopy.ts` não tinha efeito no dev até
// apagar `node_modules/.vite`. Aqui removemos essas entradas da config já resolvida para
// que o `exclude` acima volte a valer.
const keepI18nRuntimeAsSource = {
  name: 'draftaco-i18n-source-runtime',
  enforce: 'post' as const,
  configResolved(config: { optimizeDeps?: { include?: string[] } }) {
    const include = config.optimizeDeps?.include
    if (!config.optimizeDeps || !include) return

    config.optimizeDeps.include = include.filter((id) => !id.startsWith(i18nModulePrefix))
  },
}

export default defineConfig(({ command, isPreview }) => ({
  optimizeDeps: { exclude: [i18nModulePrefix, `${i18nModulePrefix}/jsx-runtime`, `${i18nModulePrefix}/jsx-dev-runtime`] },
  resolve: { alias: { [i18nModulePrefix]: fileURLToPath(new URL('./src/shared/i18n', import.meta.url)) } },
  base: command === 'serve' && !isPreview ? '/' : `${basePath}/`,
  plugins: [
    ...(process.env.VITE_DEV_HTTPS === '1'
      ? [
          basicSsl({
            name: 'draftaco-dev',
          }),
        ]
      : []),
    react({ jsxImportSource: i18nModulePrefix }),
    keepI18nRuntimeAsSource,
    {
      name: 'redirect-base-path',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === basePath) {
            res.statusCode = 302
            res.setHeader('Location', `${basePath}/`)
            res.end()
            return
          }

          next()
        })
      },
    },
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-dom/client'],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/sportsdb': {
        target: 'https://www.thesportsdb.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sportsdb/, ''),
      },
    },
  },
}))
