const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export async function fetchWithRetry(
  url: string,
  options?: RequestInit & { maxRetries?: number; timeout?: number }
): Promise<Response> {
  const { maxRetries = 3, timeout = 30_000, ...fetchOptions } = options ?? {};

  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Build a timeout controller manually so it works with fake timers in tests
    const timeoutController = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (timeout > 0) {
      timeoutId = setTimeout(() => timeoutController.abort(), timeout);
    }

    // If the caller provides a signal, forward its abort to the timeout controller
    const callerSignal = fetchOptions.signal;
    const onCallerAbort = () => timeoutController.abort();
    if (callerSignal) {
      if (callerSignal.aborted) {
        timeoutController.abort();
      } else {
        callerSignal.addEventListener('abort', onCallerAbort, { once: true });
      }
    }

    try {
      const res = await fetch(url, {
        ...fetchOptions,
        signal: timeoutController.signal,
      });

      if (!RETRYABLE_STATUS.has(res.status) || attempt === maxRetries - 1) {
        return res;
      }

      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      // Don't retry if the request was intentionally aborted by the caller
      if (callerSignal?.aborted) {
        throw new DOMException('The operation was aborted.', 'AbortError');
      }

      // If our timeout controller aborted but the caller's signal did not,
      // it means the request timed out — surface immediately, do not retry
      if (timeoutController.signal.aborted && !callerSignal?.aborted) {
        throw new DOMException(
          `Request timed out after ${timeout}ms`,
          'TimeoutError',
        );
      }

      lastError = err;

      if (attempt === maxRetries - 1) break;
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      if (callerSignal) {
        callerSignal.removeEventListener('abort', onCallerAbort);
      }
    }

    // Exponential backoff with jitter: base * (0.5 + random * 0.5)
    const base = 1000 * 2 ** attempt;
    const jitteredDelay = base * (0.5 + Math.random() * 0.5);
    await new Promise((r) => setTimeout(r, jitteredDelay));
  }

  throw lastError;
}
