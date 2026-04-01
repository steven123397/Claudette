import { expect, it } from 'vitest'

import { parseCommand } from '../../src/commands/parser'

it('parses slash commands and args', () => {
  expect(parseCommand('/model gpt-4.1')).toEqual({
    name: 'model',
    args: 'gpt-4.1',
  })
})

it('parses slash commands without args', () => {
  expect(parseCommand('/help')).toEqual({
    name: 'help',
    args: '',
  })
})

it('returns null for non-command input', () => {
  expect(parseCommand('hello')).toBeNull()
})
