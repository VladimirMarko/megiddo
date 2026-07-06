import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  buildEnvCatalog,
  envCatalogArtifactPath,
  knownInventoryVariableNames,
  renderEnvCatalogMarkdown,
} from '../scripts/env-catalog.mts'

const root = process.cwd()

test('generated Env Catalog artifact matches adjacent env metadata', () => {
  const catalog = buildEnvCatalog(root)
  const generated = renderEnvCatalogMarkdown(catalog)
  const artifact = readFileSync(join(root, envCatalogArtifactPath), 'utf8')

  assert.equal(artifact, generated)
})

test('Env Catalog preserves every variable name from the existing inventory snapshot', () => {
  const catalogVariableNames = new Set(buildEnvCatalog(root).map(entry => entry.variable))

  for (const variableName of knownInventoryVariableNames) {
    assert.equal(catalogVariableNames.has(variableName), true, `${variableName} should be present in Env Catalog`)
  }
})

test('Env Catalog includes human-facing metadata for generated documentation', () => {
  const catalog = buildEnvCatalog(root)

  assert.ok(catalog.length > 0)

  for (const entry of catalog) {
    assert.notEqual(entry.variable.trim(), '')
    assert.notEqual(entry.owner.trim(), '')
    assert.notEqual(entry.surface.trim(), '')
    assert.notEqual(entry.allowedValues.trim(), '')
    assert.notEqual(entry.defaultValue.trim(), '')
    assert.notEqual(entry.description.trim(), '')
  }
})
