import { expect, it } from 'vitest'

import { assertPathInsideWorkspace } from '../../src/workspace/policy'

it('rejects paths outside workspace root', () => {
  expect(() => assertPathInsideWorkspace('/repo', '/etc/passwd')).toThrow(/outside workspace/i)
})
