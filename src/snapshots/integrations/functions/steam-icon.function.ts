/** Fetch only content-addressed Steam icons; never proxy arbitrary URLs. */
export async function steamIcon(
  appId: string,
  hash: string,
  fetcher: typeof fetch = fetch,
): Promise<Buffer> {
  if (!/^[1-9][0-9]{0,9}$/.test(appId) || !/^[a-f0-9]{40}$/i.test(hash)) {
    throw new Error('invalid_steam_icon');
  }
  const response: Response = await fetcher(
    new Request(
      `https://media.steampowered.com/steamcommunity/public/images/apps/${appId}/${hash}.jpg`,
      {
        signal: AbortSignal.timeout(5000),
        redirect: 'error',
      },
    ),
  );
  if (
    !response.ok ||
    !response.headers.get('content-type')?.startsWith('image/jpeg') ||
    Number(response.headers.get('content-length') ?? 0) > 524288
  ) {
    throw new Error('steam_icon_unavailable');
  }
  const image: Buffer = Buffer.from(await response.arrayBuffer());
  if (image.length > 524288 || image[0] !== 255 || image[1] !== 216) {
    throw new Error('invalid_steam_image');
  }
  return image;
}
