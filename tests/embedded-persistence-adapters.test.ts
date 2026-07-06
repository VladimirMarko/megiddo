import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createEmbeddedDevelopmentAuthProviderAdapter } from '@megiddo/identity'
import { createEmbeddedTodoRepository, createTodoUseCases } from '@megiddo/todo'

test('Todo embedded persistence survives repository recreation without sharing a repo-wide database', async () => {
  const databasePath = join(await mkdtemp(join(tmpdir(), 'megiddo-todo-')), 'todo.sqlite')
  const firstRepository = createEmbeddedTodoRepository({ databasePath })
  const firstTodos = createTodoUseCases({ repository: firstRepository })

  const created = await firstTodos.create({ ownerId: 'dev:ada', title: 'Persist through restart' })
  await firstTodos.complete({ id: created.id, ownerId: 'dev:ada' })
  firstRepository.close()

  const secondRepository = createEmbeddedTodoRepository({ databasePath })
  const secondTodos = createTodoUseCases({ repository: secondRepository })

  assert.deepEqual(await secondTodos.list('dev:ada'), [
    { id: created.id, title: 'Persist through restart', completed: true },
  ])
  assert.deepEqual(await secondTodos.list('dev:grace'), [])
  secondRepository.close()
})

test('Identity embedded development auth persistence survives adapter recreation', async () => {
  const databasePath = join(await mkdtemp(join(tmpdir(), 'megiddo-identity-')), 'identity.sqlite')
  const firstAuthProvider = createEmbeddedDevelopmentAuthProviderAdapter({ databasePath })

  assert.deepEqual(await firstAuthProvider.resolveDevelopmentUser('dev:ada'), { id: 'dev:ada' })
  firstAuthProvider.close()

  const secondAuthProvider = createEmbeddedDevelopmentAuthProviderAdapter({ databasePath })

  assert.deepEqual(await secondAuthProvider.resolveDevelopmentUser('dev:ada'), { id: 'dev:ada' })
  secondAuthProvider.close()
})

test('Identity embedded dummy demo accounts are persisted principals when seeding is enabled', async () => {
  const databasePath = join(await mkdtemp(join(tmpdir(), 'megiddo-identity-demo-')), 'identity.sqlite')
  const firstAuthProvider = createEmbeddedDevelopmentAuthProviderAdapter({ databasePath, seedDemoAccounts: true })

  assert.deepEqual(await firstAuthProvider.listDummyAccounts(), [
    { displayName: 'Alice', principalId: 'dummy:alice' },
    { displayName: 'Bob', principalId: 'dummy:bob' },
  ])
  firstAuthProvider.close()

  const secondAuthProvider = createEmbeddedDevelopmentAuthProviderAdapter({ databasePath, seedDemoAccounts: true })

  assert.deepEqual(await secondAuthProvider.resolveDummyPrincipal('dummy:alice'), {
    displayName: 'Alice',
    id: 'dummy:alice',
  })
  assert.equal(await secondAuthProvider.resolveDummyPrincipal('dummy:charlie'), undefined)
  secondAuthProvider.close()
})
