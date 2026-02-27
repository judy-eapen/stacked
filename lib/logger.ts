export function logWarn(message: string, context?: Record<string, unknown>): void {
  if (context) {
    console.warn(`[warn] ${message}`, context)
    return
  }
  console.warn(`[warn] ${message}`)
}

export function logError(message: string, error: unknown, context?: Record<string, unknown>): void {
  const payload: Record<string, unknown> = {
    ...(context ?? {}),
    error: error instanceof Error ? error.message : String(error),
  }
  console.error(`[error] ${message}`, payload)
}
