import { describe, expect, it, vi } from 'vitest'

import { bootstrap } from '../../src/app/bootstrap'
import { createContainer } from '../../src/app/container'

describe('createContainer', () => {
  it('creates a container bound to the current workspace', () => {
    const container = createContainer({ cwd: '/tmp/demo' })

    expect(container.workspace.root).toBe('/tmp/demo')
    expect(container.commands).toBeDefined()
    expect(container.tools).toBeDefined()
  })
})

describe('bootstrap', () => {
  it('loads config, creates a container, and starts the repl', async () => {
    const startRepl = vi.fn(async () => {})

    const container = await bootstrap({
      cwd: '/tmp/demo',
      env: {
        CLAUDETTE_MODEL: 'gpt-4.1-mini',
      },
      startRepl,
    })

    expect(container.workspace.root).toBe('/tmp/demo')
    expect(container.config.model).toBe('gpt-4.1-mini')
    expect(startRepl).toHaveBeenCalledOnce()
    expect(startRepl).toHaveBeenCalledWith(container)
  })
})
