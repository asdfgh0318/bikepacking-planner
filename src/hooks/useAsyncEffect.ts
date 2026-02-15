import { useEffect, type DependencyList } from 'react';

/**
 * A reusable hook that handles the repeated pattern of:
 * - AbortController + cancelled flag + try/catch with AbortError check
 *
 * On mount (or dep change): creates an AbortController and calls `fn(signal)`.
 * On cleanup: aborts the controller.
 * Swallows AbortError/DOMException with name 'AbortError'.
 * Logs other errors to console.error.
 */
export function useAsyncEffect(
  fn: (signal: AbortSignal) => Promise<void>,
  deps: DependencyList
): void {
  useEffect(() => {
    const controller = new AbortController();

    fn(controller.signal).catch((err: unknown) => {
      // Swallow abort errors — these are expected on cleanup
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error(err);
    });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
