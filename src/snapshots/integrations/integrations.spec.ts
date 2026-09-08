import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { SteamIntegration } from './steam.integration';
import { SpotifyIntegration } from './spotify.integration';
import type { IntegrationDto } from '../../app/declarations/dtos/integration.dto';
import type { IntegrationEnvironment } from './declarations/interfaces/integration-environment.interface';
const spotifyEnvironment: IntegrationEnvironment = {
  SPOTIFY_CLIENT_ID: 'client',
  SPOTIFY_CLIENT_SECRET: 'secret',
  SPOTIFY_REFRESH_TOKEN: 'refresh',
};
describe('scheduled integrations', (): void => {
  it('selects the latest Steam launch, converts hours and uses a static icon path', async (): Promise<void> => {
    const fetcher: Mock<typeof fetch> = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        response: {
          games: [
            { name: 'Old', rtime_last_played: 100, playtime_forever: 6000 },
            {
              name: 'Latest',
              rtime_last_played: 900,
              playtime_forever: 90,
              appid: 620,
              img_icon_url: '25a5a16b2423bf7487ac5340b5b0948cef48c5f8',
            },
            { name: 'Never', rtime_last_played: 0, playtime_forever: 0 },
          ],
        },
      }),
    );
    const result: IntegrationDto = await new SteamIntegration(
      { STEAM_ID: '123', STEAM_API_KEY: 'secret' },
      fetcher,
    ).load(AbortSignal.timeout(1000));
    expect(result).toEqual({
      state: 'active',
      title: 'Latest',
      value: 1.5,
      appId: 620,
      artworkUrl:
        '/data/steam/620-25a5a16b2423bf7487ac5340b5b0948cef48c5f8.jpg',
    });
    expect(JSON.stringify(result)).not.toContain('secret');
  });
  it('distinguishes an empty Steam library from hidden data', async (): Promise<void> => {
    const fetcher: Mock<typeof fetch> = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ response: { game_count: 0 } }))
      .mockResolvedValueOnce(Response.json({ response: {} }));
    const steam: SteamIntegration = new SteamIntegration(
      { STEAM_ID: '123', STEAM_API_KEY: 'key' },
      fetcher,
    );
    expect(await steam.load(AbortSignal.timeout(1000))).toEqual({
      state: 'idle',
    });
    await expect(steam.load(AbortSignal.timeout(1000))).rejects.toThrow(
      'steam_library_unavailable',
    );
  });
  it('never makes authenticated requests without credentials', async (): Promise<void> => {
    const fetcher: Mock<typeof fetch> = vi.fn<typeof fetch>();
    await expect(
      new SteamIntegration({}, fetcher).load(AbortSignal.timeout(1000)),
    ).rejects.toThrow();
    await expect(
      new SpotifyIntegration({}, fetcher).load(AbortSignal.timeout(1000)),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('reads history with a played timestamp, album and safe track link', async (): Promise<void> => {
    const fetcher: Mock<typeof fetch> = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ access_token: 'access', expires_in: 3600 }),
      )
      .mockResolvedValueOnce(
        Response.json({
          items: [
            {
              played_at: '2026-09-08T10:00:00Z',
              track: {
                name: 'Track',
                artists: [{ name: 'Artist' }],
                album: { name: 'Album' },
                external_urls: {
                  spotify: 'https://open.spotify.com/track/123',
                },
              },
            },
          ],
        }),
      );
    expect(
      await new SpotifyIntegration(spotifyEnvironment, fetcher).load(
        AbortSignal.timeout(1000),
      ),
    ).toEqual({
      state: 'active',
      title: 'Track',
      detail: 'Artist',
      album: 'Album',
      playedAt: '2026-09-08T10:00:00.000Z',
      url: 'https://open.spotify.com/track/123',
    });
    const request: RequestInfo | URL | undefined = fetcher.mock.calls[1]?.[0];
    expect(request instanceof Request ? request.url : '').toBe(
      'https://api.spotify.com/v1/me/player/recently-played?limit=1',
    );
  });
  it('keeps empty history separate from errors and reuses the access token', async (): Promise<void> => {
    const fetcher: Mock<typeof fetch> = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ access_token: 'access', expires_in: 3600 }),
      )
      .mockResolvedValueOnce(Response.json({ items: [] }))
      .mockResolvedValueOnce(new Response(null, { status: 429 }));
    const spotify: SpotifyIntegration = new SpotifyIntegration(
      spotifyEnvironment,
      fetcher,
    );
    expect(await spotify.load(AbortSignal.timeout(1000))).toEqual({
      state: 'idle',
    });
    await expect(spotify.load(AbortSignal.timeout(1000))).rejects.toThrow(
      'spotify_unavailable',
    );
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it.each([
    {},
    { items: [{ played_at: 'invalid', track: { name: 'Track' } }] },
  ])(
    'rejects malformed history: %j',
    async (payload: unknown): Promise<void> => {
      const fetcher: Mock<typeof fetch> = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          Response.json({ access_token: 'access', expires_in: 3600 }),
        )
        .mockResolvedValueOnce(Response.json(payload));
      await expect(
        new SpotifyIntegration(spotifyEnvironment, fetcher).load(
          AbortSignal.timeout(1000),
        ),
      ).rejects.toThrow('invalid_spotify_history');
    },
  );
});
