import type { LogMessage } from '@/types/protocol';

type Level = LogMessage['level'];

/**
 * Minimal logger. Buffers recent lines for the debug panel and forwards to a
 * sink callback (the background WS relay) when attached. Falls back to
 * console in content/popup contexts.
 */
type Sink = (msg: LogMessage) => void;

const BUFFER_MAX = 200;
const buffer: LogMessage[] = [];
let sink: Sink | null = null;
let traceId: string | undefined;

export function setLoggerSink(s: Sink | null): void {
  sink = s;
}
export function setTraceId(id: string | undefined): void {
  traceId = id;
}

function ts(): number {
  return Date.now();
}

function emit(level: Level, message: string): void {
  const entry: LogMessage = { type: 'logs', level, message, ts: ts(), ...(traceId ? { traceId } : {}) };
  buffer.push(entry);
  if (buffer.length > BUFFER_MAX) buffer.shift();
  // eslint-disable-next-line no-console
  const c = console;
  if (level === 'error') c.error(message);
  else if (level === 'warn') c.warn(message);
  else if (level === 'debug') c.debug(message);
  else c.info(message);
  sink?.(entry);
}

export const log = {
  info: (m: string) => emit('info', m),
  warn: (m: string) => emit('warn', m),
  error: (m: string) => emit('error', m),
  debug: (m: string) => emit('debug', m),
};

export function getLogBuffer(): LogMessage[] {
  return [...buffer];
}

export function clearLogBuffer(): void {
  buffer.length = 0;
}
