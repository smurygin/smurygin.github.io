function isRecord(payload: unknown): payload is Record<string, unknown> {
  return (
    typeof payload === 'object' && payload !== null && !Array.isArray(payload)
  );
}

export function record(payload: unknown): Record<string, unknown> {
  return isRecord(payload) ? payload : {};
}
