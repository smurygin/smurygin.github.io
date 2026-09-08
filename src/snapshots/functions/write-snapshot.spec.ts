import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { writeSnapshot } from './write-snapshot.function';
import { publicConfig } from './public-config.function';
import type { IntegrationDto } from '../../app/declarations/dtos/integration.dto';
describe('public export', (): void => {
  it('publishes only public settings', (): void => {
    expect(
      publicConfig(
        {
          LOCATION: 'Tokyo',
          STEAM_API_KEY: 'SECRET',
          SPOTIFY_REFRESH_TOKEN: 'TOKEN',
        },
        { location: '' },
      ),
    ).toEqual({ location: 'Tokyo' });
  });
  it('writes snapshots with timestamps and redacts upstream errors', async (): Promise<void> => {
    const directory: string = await mkdtemp(join(tmpdir(), 'snapshots-'));
    try {
      expect(
        await writeSnapshot(directory, 'steam', (): Promise<IntegrationDto> =>
          Promise.resolve({ state: 'idle' }),
        ),
      ).toBe(true);
      const result: unknown = JSON.parse(
        await readFile(join(directory, 'steam.json'), 'utf8'),
      );
      expect(result).toHaveProperty('data', { state: 'idle' });
      expect(result).toHaveProperty('updatedAt');
      expect(
        await writeSnapshot(directory, 'spotify', (): Promise<IntegrationDto> =>
          Promise.reject(new Error('SECRET upstream response')),
        ),
      ).toBe(false);
      expect(await readFile(join(directory, 'spotify.json'), 'utf8')).toBe(
        '{"updatedAt":null,"data":null}\n',
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
