import {
  clearScreenDown,
  createInterface,
  cursorTo,
} from 'node:readline'

import { buildPrompt, isBlankInput } from './prompt'
import {
  createInputQueue,
  handleInput,
  type HandleInputContext,
} from './inputQueue'
import { renderMessage } from './renderMessage'

export type ReplIO = {
  clear(): void
  close(): void
  read(prompt: string): Promise<string | null>
  write(text: string): void
}

export type StartReplOptions = {
  io?: ReplIO
}

export async function startRepl(
  context: HandleInputContext,
  options: StartReplOptions = {},
): Promise<void> {
  const io = options.io ?? createConsoleIo()
  const queue = createInputQueue()

  try {
    while (true) {
      const input = await io.read(
        buildPrompt({
          model: context.config.model,
          sessionId: context.session.currentSessionId,
        }),
      )

      if (input === null) {
        break
      }

      if (isBlankInput(input)) {
        continue
      }

      const result = await handleInput(input, context)

      if (result.action?.type === 'clear') {
        io.clear()
      }

      queue.push(...result.messages)
      flushQueue(queue, io)

      if (result.action?.type === 'exit') {
        break
      }
    }
  } finally {
    io.close()
  }
}

function flushQueue(queue: ReturnType<typeof createInputQueue>, io: ReplIO): void {
  for (const message of queue.drain()) {
    io.write(renderMessage(message))
  }
}

function createConsoleIo(): ReplIO {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  })
  const iterator = readline[Symbol.asyncIterator]()
  let isClosed = false

  readline.on('SIGINT', () => {
    readline.close()
  })

  return {
    clear() {
      if (!process.stdout.isTTY) {
        return
      }

      cursorTo(process.stdout, 0, 0)
      clearScreenDown(process.stdout)
    },
    close() {
      if (isClosed) {
        return
      }

      isClosed = true
      readline.close()
    },
    async read(prompt: string) {
      if (isClosed) {
        return null
      }

      process.stdout.write(prompt)

      try {
        const next = await iterator.next()

        if (next.done) {
          isClosed = true
          return null
        }

        return next.value
      } catch {
        isClosed = true
        return null
      }
    },
    write(text: string) {
      process.stdout.write(text.endsWith('\n') ? text : `${text}\n`)
    },
  }
}
