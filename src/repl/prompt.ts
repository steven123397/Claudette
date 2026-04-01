export type PromptState = {
  model: string
  sessionId: string | null
}

export function buildPrompt(state: PromptState): string {
  const sessionSuffix = state.sessionId ? `#${shortSessionId(state.sessionId)}` : ''

  return `claudette[${state.model}${sessionSuffix}]> `
}

export function isBlankInput(input: string): boolean {
  return input.trim() === ''
}

function shortSessionId(sessionId: string): string {
  return sessionId.length <= 8 ? sessionId : sessionId.slice(0, 8)
}
