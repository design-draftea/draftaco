import { build } from 'esbuild'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

// Use Vite's existing esbuild dependency; no browser or new package required.
const directory = await mkdtemp(join(tmpdir(), 'draftaco-brand-contracts-'))
try {
  for (const base of ['/', '/draftaco/']) {
    const result = await build({
      stdin: {
        resolveDir: resolve('.'),
        contents: `
          import assert from 'node:assert/strict'
          import { parseBrandPath, brandPath, currentBrand, navigateToBrand } from './src/shared/brand/routing'
          import { initializeBrand, getBrandConfig } from './src/shared/brand/config'
          import { brandStorage } from './src/shared/brand/storage'
          import { jsx, jsxs } from './src/shared/i18n/jsx-runtime'
          import { jsxDEV } from './src/shared/i18n/jsx-dev-runtime'
          import { createElement } from './src/shared/i18n'
          const values = new Map()
          const base = ${JSON.stringify(base === '/' ? '' : '/draftaco')}
          globalThis.window = {
            location: { pathname: base + '/draftea', search: '?theme=light', hash: '', assign(url) { this.assigned = url } },
            localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key,value), removeItem: key => values.delete(key) },
            history: { replaceState(_state, _title, url) { window.location.pathname = url.split('?')[0] } }
          }
          globalThis.document = { documentElement: { dataset: {} }, title: '' }
          assert.equal(currentBrand(), 'draftea')
          for (const brand of ['pitaco', 'draftea']) {
            window.location.pathname = base + '/' + brand + '/cassino'
            initializeBrand()
            assert.equal(getBrandConfig().features.casino, false)
            assert.equal(window.location.pathname, base + '/' + brand + '/apostas')
          }
          window.location.pathname = base + '/draftea'
          assert.equal(brandPath('cassino'), base + '/draftea/cassino')
          assert.equal(parseBrandPath(base + '/draftea/entrar/').path, '/entrar')
          assert.equal(parseBrandPath(base + '/apostas').brand, 'pitaco')
          assert.equal(getBrandConfig().features.signup, false)
          window.location.pathname = base + '/draftea/criar-conta/'
          initializeBrand()
          assert.equal(window.location.pathname, base + '/draftea/apostas')
          assert.equal(document.documentElement.lang, 'es-MX')
          const original = { children: 'Criar conta', 'aria-label': 'Criar conta' }
          assert.equal(jsx('button', original).props.children, 'Crear cuenta')
          assert.equal(original.children, 'Criar conta')
          assert.deepEqual(jsxs('p', { children: ['Senha', ' ', 'Entrar'] }).props.children, ['Contraseña',' ','Iniciar sesión'])
          assert.equal(jsxDEV('button', original, undefined, false, undefined, undefined).props.children, 'Crear cuenta')
          assert.equal(createElement('button', {}, 'Criar conta').props.children, 'Crear cuenta')
          assert.equal(jsx('input', { value: 'Senha', placeholder: 'Senha' }).props.value, 'Senha')
          assert.equal(jsx('span', {children:'Senha','data-brand-localization-skip':'true'}).props.children, 'Senha')
          brandStorage.setItem('draftaco:feature-flags', 'draftea-only')
          window.location.pathname = base + '/pitaco/criar-conta'
          initializeBrand()
          assert.equal(getBrandConfig().features.signup, true)
          assert.equal(document.documentElement.lang, 'pt-BR')
          assert.equal(jsx('button', original).props.children, 'Criar conta')
          assert.equal(brandStorage.getItem('draftaco:feature-flags'), null)
          brandStorage.setItem('draftaco:feature-flags', 'pitaco-only')
          navigateToBrand('draftea')
          assert.equal(window.location.assigned, base + '/draftea/apostas?theme=light')
          window.location.pathname = base + '/draftea'
          assert.equal(brandStorage.getItem('draftaco:feature-flags'), 'draftea-only')
          window.localStorage.getItem = () => { throw new Error('Blocked') }
          assert.equal(brandStorage.getItem('test'), null)
          console.log('Brand contracts OK: ' + (base || '/'))
        `,
      },
      bundle: true, platform: 'node', format: 'cjs', write: false,
      define: { 'import.meta.env.BASE_URL': JSON.stringify(base) },
      loader: { '.svg': 'dataurl' },
    })
    const file = join(directory, 'contracts.cjs')
    await writeFile(file, result.outputFiles[0].text)
    process.stdout.write(execFileSync(process.execPath, [file], { encoding: 'utf8' }))
  }
} finally {
  await rm(directory, { recursive: true, force: true })
}
