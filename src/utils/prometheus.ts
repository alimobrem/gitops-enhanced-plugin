export function parsePrometheusGauge(
  resp: { data?: { result?: Array<{ metric?: Record<string, string>; value?: [number, string] }> } } | undefined,
  loaded: boolean,
  labelKey: string,
): Map<string, number> {
  const m = new Map<string, number>();
  if (!loaded || !resp?.data?.result) return m;
  for (const entry of resp.data.result) {
    const key = entry.metric?.[labelKey];
    const val = parseFloat(entry.value?.[1] ?? '');
    if (key && !isNaN(val)) m.set(key, val);
  }
  return m;
}

export function parsePrometheusScalar(
  resp: { data?: { result?: Array<{ value?: [number, string] }> } } | undefined,
): number | null {
  if (!resp?.data?.result?.[0]?.value) return null;
  const val = parseFloat(resp.data.result[0].value[1]);
  return isNaN(val) ? null : val;
}

export function parsePrometheusRange(
  resp: { data?: { result?: Array<{ values?: Array<[number, string]> }> } } | undefined,
): Array<{ x: Date; y: number }> {
  const values = resp?.data?.result?.[0]?.values ?? [];
  return values.map(([ts, val]) => ({ x: new Date(ts * 1000), y: parseFloat(val) || 0 }));
}
