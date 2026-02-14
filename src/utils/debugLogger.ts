type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  event: string;
  details: string;
}

const MAX_ENTRIES = 5000;
const entries: LogEntry[] = [];
let enabled = true;
type Listener = () => void;
const listeners: Set<Listener> = new Set();
let notifyPending = false;

function now(): string {
  return new Date().toISOString();
}

function sanitize(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export const debugLog = {
  enable() { enabled = true; },
  disable() { enabled = false; },
  isEnabled() { return enabled; },

  /** Subscribe to new log entries — returns unsubscribe fn */
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  log(level: LogLevel, category: string, event: string, details?: unknown) {
    if (!enabled) return;
    const detailStr = details === undefined
      ? ''
      : typeof details === 'string'
        ? details
        : JSON.stringify(details);

    const entry: LogEntry = {
      timestamp: now(),
      level,
      category,
      event,
      details: detailStr,
    };

    entries.push(entry);
    if (entries.length > MAX_ENTRIES) entries.shift();

    // Notify subscribers (debounced to avoid re-render storms)
    if (!notifyPending) {
      notifyPending = true;
      queueMicrotask(() => {
        notifyPending = false;
        for (const fn of listeners) fn();
      });
    }

    // Browser console with color
    const colors: Record<LogLevel, string> = {
      debug: 'color: #888',
      info: 'color: #38bdf8',
      warn: 'color: #fbbf24',
      error: 'color: #ef4444; font-weight: bold',
    };
    console.log(
      `%c[${level.toUpperCase()}] [${category}] ${event}`,
      colors[level],
      details !== undefined ? details : ''
    );
  },

  info(category: string, event: string, details?: unknown) {
    this.log('info', category, event, details);
  },
  warn(category: string, event: string, details?: unknown) {
    this.log('warn', category, event, details);
  },
  error(category: string, event: string, details?: unknown) {
    this.log('error', category, event, details);
  },
  debug(category: string, event: string, details?: unknown) {
    this.log('debug', category, event, details);
  },

  getEntries(): LogEntry[] {
    return [...entries];
  },

  getLast(n: number): LogEntry[] {
    return entries.slice(-n);
  },

  clear() {
    entries.length = 0;
    for (const fn of listeners) fn();
  },

  count() { return entries.length; },

  toCSV(): string {
    const header = 'timestamp,level,category,event,details';
    const rows = entries.map((e) =>
      [e.timestamp, e.level, sanitize(e.category), sanitize(e.event), sanitize(e.details)].join(',')
    );
    return [header, ...rows].join('\n');
  },

  download(filename?: string) {
    const csv = this.toCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `bikepacking-debug-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  summary(): Record<string, Record<LogLevel, number>> {
    const result: Record<string, Record<LogLevel, number>> = {};
    for (const e of entries) {
      if (!result[e.category]) result[e.category] = { debug: 0, info: 0, warn: 0, error: 0 };
      result[e.category][e.level]++;
    }
    return result;
  },
};

// Expose globally for console access
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__debugLog = debugLog;
}
