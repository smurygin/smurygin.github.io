import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import type { IntegrationDto } from '../../app/declarations/dtos/integration.dto';
import { steamArtwork } from './steam-artwork.function';
import { writeSnapshot } from './write-snapshot.function';
import { record } from '../../app/functions/record.function';

const hash: string = '25a5a16b2423bf7487ac5340b5b0948cef48c5f8';
const game: IntegrationDto = {
  state: 'active',
  title: 'Portal 2',
  value: 24.8,
  appId: 620,
  artworkUrl: `/data/steam/620-${hash}.jpg`,
};

describe('Steam artwork export', (): void => {
  it('keeps game data and a fresh timestamp when the CDN fails', async (): Promise<void> => {
    const directory: string = await mkdtemp(join(tmpdir(), 'steam-artwork-'));
    const fetcher: Mock<typeof fetch> = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error('CDN timeout'))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    try {
      for (const attempt of [1, 2]) {
        expect(
          await writeSnapshot(directory, 'steam', (): Promise<IntegrationDto> =>
            steamArtwork(directory, game, fetcher),
          ),
        ).toBe(true);
        const snapshot: unknown = JSON.parse(
          await readFile(join(directory, 'steam.json'), 'utf8'),
        );
        expect(record(snapshot)['data']).toEqual({
          state: 'active',
          title: 'Portal 2',
          value: 24.8,
          appId: 620,
        });
        const updatedAt: unknown = record(snapshot)['updatedAt'];
        expect(typeof updatedAt).toBe('string');
        expect(
          typeof updatedAt === 'string' &&
            Number.isFinite(Date.parse(updatedAt)),
        ).toBe(true);
        expect(fetcher).toHaveBeenCalledTimes(attempt);
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('writes a valid icon and preserves its public URL', async (): Promise<void> => {
    const directory: string = await mkdtemp(join(tmpdir(), 'steam-artwork-'));
    const fetcher: Mock<typeof fetch> = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(new Uint8Array([255, 216, 255, 217]), {
        headers: { 'content-type': 'image/jpeg' },
      }),
    );
    try {
      expect(await steamArtwork(directory, game, fetcher)).toEqual(game);
      expect(
        await readFile(join(directory, 'steam', `620-${hash}.jpg`)),
      ).toEqual(Buffer.from([255, 216, 255, 217]));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
