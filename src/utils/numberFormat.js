export function coerceNumber(value) {
  if (value == null) return null;
  if (typeof value === 'number' && isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return isFinite(n) ? n : null;
  }
  if (typeof value === 'object') {
    // Common pattern: { average: number|string }
    if ('average' in value) return coerceNumber(value.average);
  }
  return null;
}

export function formatNumber(value, { decimals = 0, fallback = '0', clampMin, clampMax } = {}) {
  const n = coerceNumber(value);
  if (n == null) return fallback;
  let v = n;
  if (typeof clampMin === 'number' && v < clampMin) v = clampMin;
  if (typeof clampMax === 'number' && v > clampMax) v = clampMax;
  // Ensure finite before formatting
  return Number.isFinite(v) ? v.toFixed(decimals) : fallback;
}

export function formatRating(value, { decimals = 1, fallback = '4.8' } = {}) {
  // Ratings commonly range 0..5
  return formatNumber(value, { decimals, fallback, clampMin: 0, clampMax: 5 });
}

export function formatCurrencyINR(value, { decimals = 0, fallback = '—' } = {}) {
  const n = coerceNumber(value);
  if (n == null) return fallback;
  // Avoid Intl for perf; keep consistent with existing UI style (prefix only)
  return `₹${n.toFixed(decimals)}`;
}
