export async function fetchJson(
  request: Request,
  fetcher: typeof fetch,
): Promise<unknown> {
  const response: Response = await fetcher(request);
  if (!response.ok) {
    throw new Error('upstream_failed');
  }
  if (response.status === 204) {
    return {};
  }
  const payload: unknown = await response.json();
  return payload;
}
