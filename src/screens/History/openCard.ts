// Remembers which History card was open when a chart was opened from it, so coming
// back shows the same card open.
let remembered: string | null = null;

export function rememberOpenCard(sessionId: string) {
  remembered = sessionId;
}

export function takeRememberedCard(): string | null {
  return remembered;
}

export function forgetRememberedCard() {
  remembered = null;
}
