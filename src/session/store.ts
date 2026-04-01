import { appendJsonl, readJsonl } from '../utils/jsonl'
import { getTranscriptPath } from './index'
import { isTranscriptMessage, type TranscriptMessage } from './types'

export async function appendTranscript(
  sessionDir: string,
  messages: readonly TranscriptMessage[],
): Promise<void> {
  for (const message of messages) {
    if (!isTranscriptMessage(message)) {
      throw new Error('Invalid transcript message')
    }
  }

  await appendJsonl(getTranscriptPath(sessionDir), messages)
}

export async function loadTranscript(sessionDir: string): Promise<TranscriptMessage[]> {
  return readJsonl(getTranscriptPath(sessionDir), isTranscriptMessage)
}
