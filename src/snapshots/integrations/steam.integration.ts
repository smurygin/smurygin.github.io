import type { IntegrationDto } from '../../app/declarations/dtos/integration.dto';
import type { ExternalIntegrationPlugin } from './declarations/interfaces/external-integration-plugin.interface';
import type { IntegrationEnvironment } from './declarations/interfaces/integration-environment.interface';
import { fetchJson } from './functions/fetch-json.function';
import { record } from '../../app/functions/record.function';
import { required } from './functions/required.function';
export class SteamIntegration implements ExternalIntegrationPlugin {
  public readonly id: string = 'steam';
  public constructor(
    private readonly environment: IntegrationEnvironment,
    private readonly fetcher: typeof fetch = fetch,
  ) {}
  public async load(signal: AbortSignal): Promise<IntegrationDto> {
    const parameters: URLSearchParams = new URLSearchParams({
      key: required(this.environment.STEAM_API_KEY, 'STEAM_API_KEY'),
      steamid: required(this.environment.STEAM_ID, 'STEAM_ID'),
      include_appinfo: 'true',
      include_played_free_games: 'true',
      include_extended_appinfo: 'true',
      format: 'json',
    });
    const payload: Record<string, unknown> = record(
      await fetchJson(
        new Request(
          `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?${parameters}`,
          { signal },
        ),
        this.fetcher,
      ),
    );
    const response: Record<string, unknown> = record(payload['response']);
    const games: unknown = response['games'];
    if (response['game_count'] === 0) {
      return { state: 'idle' };
    }
    if (!Array.isArray(games)) {
      throw new Error('steam_library_unavailable');
    }
    const game: Record<string, unknown> | undefined = games
      .map((entry: unknown): Record<string, unknown> => record(entry))
      .filter(
        (entry: Record<string, unknown>): boolean =>
          typeof entry['rtime_last_played'] === 'number' &&
          Number.isFinite(entry['rtime_last_played']) &&
          entry['rtime_last_played'] > 0,
      )
      .reduce<Record<string, unknown> | undefined>(
        (
          latest: Record<string, unknown> | undefined,
          entry: Record<string, unknown>,
        ): Record<string, unknown> =>
          latest === undefined ||
          Number(entry['rtime_last_played']) >
            Number(latest['rtime_last_played'])
            ? entry
            : latest,
        undefined,
      );
    if (game === undefined) {
      return { state: 'idle' };
    }
    if (
      typeof game['name'] !== 'string' ||
      typeof game['playtime_forever'] !== 'number' ||
      !Number.isFinite(game['playtime_forever']) ||
      game['playtime_forever'] < 0
    ) {
      throw new Error('invalid_steam_game');
    }
    const appId: unknown = game['appid'];
    const icon: unknown = game['img_icon_url'];
    return {
      state: 'active',
      title: game['name'],
      value: Math.round(game['playtime_forever'] / 6) / 10,
      ...(typeof appId === 'number' ? { appId } : {}),
      ...(typeof appId === 'number' &&
      typeof icon === 'string' &&
      /^[a-f0-9]{40}$/i.test(icon)
        ? {
            artworkUrl: `/data/steam/${String(appId)}-${icon}.jpg`,
          }
        : {}),
    };
  }
}
