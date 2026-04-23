export function withRetrySync<T>(
  fn: () => T,
  maxAttempts = 3,
  initialBackoffMs = 500
): T {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        sleepSync(initialBackoffMs * Math.pow(2, attempt - 1));
      }
    }
  }
  throw lastError;
}

function sleepSync(ms: number): void {
  const end = Date.now() + ms;
  while (Date.now() < end) { /* backoff wait */ }
}
