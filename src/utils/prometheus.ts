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
