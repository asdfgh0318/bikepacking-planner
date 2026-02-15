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

    // First attempt fails immediately, max jittered backoff = 1000ms (base 1s * 2^0)
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

    // After attempt 0: max jittered backoff = 1000ms (base 1s * 2^0)
    await vi.advanceTimersByTimeAsync(1000);
    // After attempt 1: max jittered backoff = 2000ms (base 1s * 2^1)
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

    // Max jittered backoff for attempt 0 = 1000ms
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
    const controller = new AbortController();
    controller.abort();
    const abortError = new DOMException('The operation was aborted.', 'AbortError');
    const mockFetch = vi.fn().mockRejectedValue(abortError);
    vi.stubGlobal('fetch', mockFetch);

    await expect(
      fetchWithRetry('https://api.example.com/data', { signal: controller.signal }),
    ).rejects.toThrow('The operation was aborted.');
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

    // Max jittered backoff for attempt 0 = 1000ms
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

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/data',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'value' }),
      }),
    );
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

  // -------------------------------------------------------------------------
  // Timeout tests
  // -------------------------------------------------------------------------

  it('rejects with TimeoutError when fetch exceeds timeout', async () => {
    // A fetch that hangs until the signal is aborted (like a real slow server)
    const mockFetch = vi.fn().mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }),
    );
    vi.stubGlobal('fetch', mockFetch);

    const promise = fetchWithRetry('https://api.example.com/slow', {
      timeout: 5000,
      maxRetries: 1,
    });

    // Guard against unhandled rejection
    let caughtError: unknown;
    const guarded = promise.catch((err: unknown) => { caughtError = err; });

    // Advance past the timeout
    await vi.advanceTimersByTimeAsync(5000);
    await guarded;

    expect(caughtError).toBeInstanceOf(DOMException);
    expect((caughtError as DOMException).name).toBe('TimeoutError');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('does not retry after a timeout error', async () => {
    const mockFetch = vi.fn().mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }),
    );
    vi.stubGlobal('fetch', mockFetch);

    const promise = fetchWithRetry('https://api.example.com/slow', {
      timeout: 2000,
      maxRetries: 3,
    });

    // Guard against unhandled rejection
    let caughtError: unknown;
    const guarded = promise.catch((err: unknown) => { caughtError = err; });

    await vi.advanceTimersByTimeAsync(2000);
    await guarded;

    expect(caughtError).toBeInstanceOf(DOMException);
    expect((caughtError as DOMException).name).toBe('TimeoutError');
    // Should only attempt once — timeout is not retried
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Jitter tests
  // -------------------------------------------------------------------------

  it('applies jitter to backoff delays within the expected range', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))   // attempt 0 -> backoff
      .mockRejectedValueOnce(new Error('fail'))   // attempt 1 -> backoff
      .mockRejectedValueOnce(new Error('fail'));   // attempt 2 -> done
    vi.stubGlobal('fetch', mockFetch);

    // Disable timeout so its setTimeout doesn't pollute the spy
    const promise = fetchWithRetry('https://api.example.com/data', { maxRetries: 3, timeout: 0 });
    const err = await drainAndExpectRejection(promise);
    expect(err.message).toBe('fail');

    // Collect the setTimeout delay arguments used for backoff
    // Filter out non-backoff setTimeout calls (delay 0 or undefined)
    const backoffDelays = setTimeoutSpy.mock.calls
      .map((call) => call[1] as number)
      .filter((delay) => delay !== undefined && delay > 0);

    // We expect exactly 2 backoff delays (between attempt 0-1 and 1-2)
    expect(backoffDelays).toHaveLength(2);

    // Attempt 0: base = 1000, jittered range = [500, 1000]
    expect(backoffDelays[0]).toBeGreaterThanOrEqual(500);
    expect(backoffDelays[0]).toBeLessThanOrEqual(1000);

    // Attempt 1: base = 2000, jittered range = [1000, 2000]
    expect(backoffDelays[1]).toBeGreaterThanOrEqual(1000);
    expect(backoffDelays[1]).toBeLessThanOrEqual(2000);
  });
});
