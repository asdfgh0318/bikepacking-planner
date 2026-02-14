import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry } from './fetchWithRetry';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockResponse(status: number, body = ''): Response {
  return new Response(body, { status, statusText: `Status ${status}` });
}

/**
 * Run fetchWithRetry expecting it to reject. Attaches a .catch() handler
 * immediately to prevent "unhandled rejection" warnings that surface when
 * fake timers trigger async rejections during advancement.
 */
async function drainAndExpectRejection(
  promise: Promise<unknown>,
): Promise<Error> {
  let caughtError: unknown;
  const guarded = promise.catch((err: unknown) => {
    caughtError = err;
  });
  await vi.runAllTimersAsync();
  await guarded;
  expect(caughtError).toBeInstanceOf(Error);
  return caughtError as Error;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('fetchWithRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns the response on a successful first try', async () => {
    const mockFetch = vi.fn().mockResolvedValue(mockResponse(200, 'ok'));
    vi.stubGlobal('fetch', mockFetch);

    const res = await fetchWithRetry('https://api.example.com/data');

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('retries on network error and returns on subsequent success', async () => {
    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error('network failure'))
      .mockResolvedValueOnce(mockResponse(200, 'ok'));
    vi.stubGlobal('fetch', mockFetch);

    const promise = fetchWithRetry('https://api.example.com/data');

    // First attempt fails immediately, backoff = 1000ms (1s * 2^0)
    await vi.advanceTimersByTimeAsync(1000);

    const res = await promise;

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('retries on 429 status with exponential backoff', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockResponse(429))  // attempt 0
      .mockResolvedValueOnce(mockResponse(429))  // attempt 1
      .mockResolvedValueOnce(mockResponse(200, 'ok'));  // attempt 2
    vi.stubGlobal('fetch', mockFetch);

    const promise = fetchWithRetry('https://api.example.com/data');

    // After attempt 0: backoff = 1000ms (1s * 2^0)
    await vi.advanceTimersByTimeAsync(1000);
    // After attempt 1: backoff = 2000ms (1s * 2^1)
    await vi.advanceTimersByTimeAsync(2000);

    const res = await promise;

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('retries on 500/502/503/504 statuses', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockResponse(503))
      .mockResolvedValueOnce(mockResponse(200, 'recovered'));
    vi.stubGlobal('fetch', mockFetch);

    const promise = fetchWithRetry('https://api.example.com/data');

    await vi.advanceTimersByTimeAsync(1000);

    const res = await promise;

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry on non-retryable status (e.g. 400) and returns immediately', async () => {
    const mockFetch = vi.fn().mockResolvedValue(mockResponse(400, 'bad request'));
    vi.stubGlobal('fetch', mockFetch);

    const res = await fetchWithRetry('https://api.example.com/data');

    expect(res.status).toBe(400);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('does not retry on 404 and returns the response', async () => {
    const mockFetch = vi.fn().mockResolvedValue(mockResponse(404));
    vi.stubGlobal('fetch', mockFetch);

    const res = await fetchWithRetry('https://api.example.com/missing');

    expect(res.status).toBe(404);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('throws immediately on AbortError without retrying', async () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError');
    const mockFetch = vi.fn().mockRejectedValue(abortError);
    vi.stubGlobal('fetch', mockFetch);

    await expect(fetchWithRetry('https://api.example.com/data')).rejects.toThrow(
      'The operation was aborted.',
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('throws last error after exhausting all retries on network errors', async () => {
    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error('connection refused'))
      .mockRejectedValueOnce(new Error('connection refused'))
      .mockRejectedValueOnce(new Error('connection refused'));
    vi.stubGlobal('fetch', mockFetch);

    const promise = fetchWithRetry('https://api.example.com/data', { maxRetries: 3 });
    const err = await drainAndExpectRejection(promise);

    expect(err.message).toBe('connection refused');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('returns retryable response on last attempt instead of retrying further', async () => {
    // With maxRetries=2, a 429 on the last attempt is returned, not retried
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockResponse(429))
      .mockResolvedValueOnce(mockResponse(429));
    vi.stubGlobal('fetch', mockFetch);

    const promise = fetchWithRetry('https://api.example.com/data', { maxRetries: 2 });

    // After attempt 0: backoff = 1s
    await vi.advanceTimersByTimeAsync(1000);

    const res = await promise;

    // On the final attempt, it returns the 429 response instead of throwing
    expect(res.status).toBe(429);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('passes through request options to fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue(mockResponse(200));
    vi.stubGlobal('fetch', mockFetch);

    await fetchWithRetry('https://api.example.com/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'value' }),
    });

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'value' }),
    });
  });

  it('defaults to maxRetries=3 when not specified', async () => {
    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'));
    vi.stubGlobal('fetch', mockFetch);

    const promise = fetchWithRetry('https://api.example.com/data');
    const err = await drainAndExpectRejection(promise);

    expect(err.message).toBe('fail');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('respects custom maxRetries setting', async () => {
    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error('fail'));
    vi.stubGlobal('fetch', mockFetch);

    const promise = fetchWithRetry('https://api.example.com/data', { maxRetries: 1 });
    const err = await drainAndExpectRejection(promise);

    expect(err.message).toBe('fail');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
