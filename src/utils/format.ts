function snakeToCamel(s: string): string {
  return s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

export function camelizeKeys<T>(obj: unknown): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => camelizeKeys(item)) as T;
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[snakeToCamel(key)] = camelizeKeys(value);
    }
    return result as T;
  }
  return obj as T;
}

const PIPS_PER_USD = 10_000;

/** Convert a pips string (e.g. "15000") to a formatted USD string (e.g. "$1.50") */
export function pipsToUsd(pips: string | number): string {
  const value = typeof pips === 'string' ? Number(pips) : pips;
  return formatUsd(value / PIPS_PER_USD);
}

/** Convert basis points to a display multiplier (e.g. 20000 → "2x") */
export function bpsToMultiplier(bps: number): string {
  return `${(bps / 10_000).toFixed(1).replace(/\.0$/, '')}x`;
}

/** Format a number as a USD string */
export function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
