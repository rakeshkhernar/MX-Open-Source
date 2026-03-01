/**
 * Development logging utility
 * Enabled only when globalThis.__MX_DEBUG_LOGS is true
 */

export function devLog(level, source, message, data = null) {
  if (!globalThis.__MX_DEBUG_LOGS) return;

  const logFn = console[level] || console.log;
  logFn(`[${source}]`, message, data || '');
}
