const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export async function fetchWithRetry(
  url: string,
  options?: RequestInit & { maxRetries?: number }
): Promise<Response> {
  const { maxRetries = 3, ...fetchOptions } = options ?? {};

  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, fetchOptions);

      if (!RETRYABLE_STATUS.has(res.status) || attempt === maxRetries - 1) {
        return res;
      }

      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      // Don't retry if the request was intentionally aborted
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
      lastError = err;

      if (attempt === maxRetries - 1) break;
    }

    // Exponential backoff: 1s, 2s, 4s
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
  }

  throw lastError;
}
