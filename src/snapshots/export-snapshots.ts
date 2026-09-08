import { writeFile, access, readFile, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SteamIntegration } from './integrations/steam.integration';
import { SpotifyIntegration } from './integrations/spotify.integration';
import { steamArtwork } from './functions/steam-artwork.function';
import { writeSnapshot } from './functions/write-snapshot.function';
import { publicConfig } from './functions/public-config.function';
import type { IntegrationDto } from '../app/declarations/dtos/integration.dto';
import type { IntegrationEnvironment } from './integrations/declarations/interfaces/integration-environment.interface';
import type { SiteConfigDto } from '../app/declarations/dtos/site-config.dto';
import { record } from '../app/functions/record.function';

async function main(): Promise<void> {
  const root: string = 'dist/website/browser';
  await access(join(root, 'index.html'));
  await copyFile(
    'dist/website/3rdpartylicenses.txt',
    join(root, '3rdpartylicenses.txt'),
  );
  const directory: string = join(root, 'data');
  const raw: Record<string, unknown> = record(
    JSON.parse(await readFile('public/site-config.json', 'utf8')),
  );
  const siteConfig: SiteConfigDto = {
    location: typeof raw['location'] === 'string' ? raw['location'] : '',
  };
  const environment: IntegrationEnvironment = {
    LOCATION: process.env['LOCATION'],
    STEAM_API_KEY: process.env['STEAM_API_KEY'],
    STEAM_ID: process.env['STEAM_ID'],
    SPOTIFY_CLIENT_ID: process.env['SPOTIFY_CLIENT_ID'],
    SPOTIFY_CLIENT_SECRET: process.env['SPOTIFY_CLIENT_SECRET'],
    SPOTIFY_REFRESH_TOKEN: process.env['SPOTIFY_REFRESH_TOKEN'],
  };
  await writeFile(
    join(root, 'site-config.json'),
    `${JSON.stringify(publicConfig(environment, siteConfig))}\n`,
  );
  const steam: SteamIntegration = new SteamIntegration(environment);
  const spotify: SpotifyIntegration = new SpotifyIntegration(environment);
  const steamOk: boolean = await writeSnapshot(
    directory,
    steam.id,
    async (): Promise<IntegrationDto> => {
      const data: IntegrationDto = await steam.load(AbortSignal.timeout(10000));
      return steamArtwork(directory, data);
    },
  );
  const spotifyOk: boolean = await writeSnapshot(
    directory,
    spotify.id,
    (): Promise<IntegrationDto> => spotify.load(AbortSignal.timeout(10000)),
  );
  if (!steamOk) {
    console.warn(
      '::warning::Steam snapshot unavailable. Check credentials, profile visibility and API status.',
    );
  }
  if (!spotifyOk) {
    console.warn(
      '::warning::Spotify snapshot unavailable. Check credentials, recently-played scope and API status.',
    );
  }
  console.info(
    'Public snapshots written. Credentials are never included in the site artifact.',
  );
}
main().catch((): never => {
  console.error('Snapshot export failed while writing the site artifact.');
  process.exit(1);
});
