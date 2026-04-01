import { readJsonlRecover } from '../utils/jsonl'
import { getTranscriptPath } from './index'
import { isTranscriptMessage, type TranscriptMessage } from './types'

export async function resumeTranscript(sessionDir: string): Promise<TranscriptMessage[]> {
  return readJsonlRecover(getTranscriptPath(sessionDir), isTranscriptMessage)
}
