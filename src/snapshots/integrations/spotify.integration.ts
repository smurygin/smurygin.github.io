import { BehaviorSubject } from 'rxjs';
import type { IntegrationDto } from '../../app/declarations/dtos/integration.dto';
import type { ExternalIntegrationPlugin } from './declarations/interfaces/external-integration-plugin.interface';
import type { IntegrationEnvironment } from './declarations/interfaces/integration-environment.interface';
import { CachedValue } from './declarations/classes/cached-value';
import { fetchJson } from './functions/fetch-json.function';
import { record } from '../../app/functions/record.function';
import { required } from './functions/required.function';

interface AccessToken {
  readonly value: string;
  readonly expiresIn: number;
}

export class SpotifyIntegration implements ExternalIntegrationPlugin {
  public readonly id: string = 'spotify';
  private readonly rotatedRefreshToken: BehaviorSubject<string | undefined> =
    new BehaviorSubject<string | undefined>(undefined);
  private readonly access: CachedValue<AccessToken> =
    new CachedValue<AccessToken>(
      (): Promise<AccessToken> => this.refresh(),
      (token: AccessToken): number => Math.max(0, token.expiresIn - 60) * 1000,
    );

  public constructor(
    private readonly environment: IntegrationEnvironment,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  private async refresh(): Promise<AccessToken> {
    const clientId: string = required(
      this.environment.SPOTIFY_CLIENT_ID,
      'SPOTIFY_CLIENT_ID',
    );
    const clientSecret: string = required(
      this.environment.SPOTIFY_CLIENT_SECRET,
      'SPOTIFY_CLIENT_SECRET',
    );
    const refreshToken: string = required(
      this.rotatedRefreshToken.value ?? this.environment.SPOTIFY_REFRESH_TOKEN,
      'SPOTIFY_REFRESH_TOKEN',
    );
    const token: Record<string, unknown> = record(
      await fetchJson(
        new Request('https://accounts.spotify.com/api/token', {
          method: 'POST',
          signal: AbortSignal.timeout(8000),
          headers: {
            authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
            'content-type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
          }).toString(),
        }),
        this.fetcher,
      ),
    );
    if (
      typeof token['access_token'] !== 'string' ||
      token['access_token'].length === 0 ||
      typeof token['expires_in'] !== 'number' ||
      !Number.isFinite(token['expires_in']) ||
      token['expires_in'] <= 0
    ) {
      throw new Error('invalid_token_response');
    }
    if (
      typeof token['refresh_token'] === 'string' &&
      token['refresh_token'].length > 0
    ) {
      this.rotatedRefreshToken.next(token['refresh_token']);
    }
    return { value: token['access_token'], expiresIn: token['expires_in'] };
  }

  public async load(signal: AbortSignal): Promise<IntegrationDto> {
    signal.throwIfAborted();
    const token: AccessToken = await this.access.load();
    signal.throwIfAborted();
    const response: Response = await this.fetcher(
      new Request(
        'https://api.spotify.com/v1/me/player/recently-played?limit=1',
        {
          signal,
          headers: { authorization: `Bearer ${token.value}` },
        },
      ),
    );
    if (response.status === 401) {
      this.access.invalidate();
    }
    if (!response.ok) {
      throw new Error('spotify_unavailable');
    }
    const payload: Record<string, unknown> = record(await response.json());
    const items: unknown = payload['items'];
    if (!Array.isArray(items)) {
      throw new Error('invalid_spotify_history');
    }
    if (items.length === 0) {
      return { state: 'idle' };
    }
    const entry: Record<string, unknown> = record(items[0]);
    const item: Record<string, unknown> = record(entry['track']);
    const playedAt: unknown = entry['played_at'];
    if (
      typeof item['name'] !== 'string' ||
      typeof playedAt !== 'string' ||
      !Number.isFinite(Date.parse(playedAt))
    ) {
      throw new Error('invalid_spotify_history');
    }
    const artists: unknown = item['artists'];
    const album: unknown = record(item['album'])['name'];
    const link: unknown = record(item['external_urls'])['spotify'];
    return {
      state: 'active',
      title: item['name'],
      playedAt: new Date(playedAt).toISOString(),
      detail: Array.isArray(artists)
        ? artists
            .map((artist: unknown): string => {
              const name: unknown = record(artist)['name'];
              return typeof name === 'string' ? name : '';
            })
            .filter((name: string): boolean => name.length > 0)
            .join(', ')
        : '',
      ...(typeof album === 'string' && album.length > 0 ? { album } : {}),
      ...(typeof link === 'string' &&
      /^https:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]+$/.test(link)
        ? { url: link }
        : {}),
    };
  }
}
