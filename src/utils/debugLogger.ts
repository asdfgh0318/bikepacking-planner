/**
 * Console logger. Silent in production builds; in dev it prints structured
 * `[category] event {details}` lines so a trace of route → supply → plan is
 * readable in the browser console.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

function emit(level: Level, category: string, event: string, details?: unknown) {
  if (!import.meta.env.DEV) return;
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(`[${category}] ${event}`, details === undefined ? '' : details);
}

export const debugLog = {
  debug: (c: string, e: string, d?: unknown) => emit('debug', c, e, d),
  info: (c: string, e: string, d?: unknown) => emit('info', c, e, d),
  warn: (c: string, e: string, d?: unknown) => emit('warn', c, e, d),
  error: (c: string, e: string, d?: unknown) => emit('error', c, e, d),
};
