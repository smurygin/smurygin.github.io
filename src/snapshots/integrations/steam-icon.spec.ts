import type { Mock } from 'vitest';
import { describe, expect, it, vi } from 'vitest';
import { steamIcon } from './functions/steam-icon.function';

const hash: string = '25a5a16b2423bf7487ac5340b5b0948cef48c5f8';

describe('Steam icon delivery', (): void => {
  it('rejects arbitrary paths before contacting the CDN', async (): Promise<void> => {
    const fetcher: Mock<typeof fetch> = vi.fn<typeof fetch>();
    await expect(steamIcon('../private', hash, fetcher)).rejects.toThrow(
      'invalid_steam_icon',
    );
    await expect(
      steamIcon('620', 'https://example.com/icon.jpg', fetcher),
    ).rejects.toThrow('invalid_steam_icon');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('uses only the official CDN without following redirects', async (): Promise<void> => {
    const fetcher: Mock<typeof fetch> = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(new Uint8Array([255, 216, 255, 217]), {
        headers: { 'content-type': 'image/jpeg' },
      }),
    );
    expect(await steamIcon('620', hash, fetcher)).toEqual(
      Buffer.from([255, 216, 255, 217]),
    );
    const request: string | URL | Request | undefined =
      fetcher.mock.calls[0]?.[0];
    expect(
      request instanceof Request ? new URL(request.url).hostname : '',
    ).toBe('media.steampowered.com');
    expect(request instanceof Request ? request.redirect : '').toBe('error');
  });

  it('rejects non-image and oversized responses', async (): Promise<void> => {
    const fetcher: Mock<typeof fetch> = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response('<html>error</html>', {
          headers: { 'content-type': 'text/html' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          headers: { 'content-type': 'image/jpeg', 'content-length': '524289' },
        }),
      );
    await expect(steamIcon('620', hash, fetcher)).rejects.toThrow(
      'steam_icon_unavailable',
    );
    await expect(steamIcon('620', hash, fetcher)).rejects.toThrow(
      'steam_icon_unavailable',
    );
  });
});
