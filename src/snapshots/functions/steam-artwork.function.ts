import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { IntegrationDto } from '../../app/declarations/dtos/integration.dto';
import { steamIcon } from '../integrations/functions/steam-icon.function';

export async function steamArtwork(
  directory: string,
  data: IntegrationDto,
  fetcher: typeof fetch = fetch,
): Promise<IntegrationDto> {
  const { artworkUrl, ...fallback }: IntegrationDto = data;
  const match: RegExpExecArray | null =
    /^\/data\/steam\/([1-9][0-9]{0,9})-([a-f0-9]{40})\.jpg$/i.exec(
      artworkUrl ?? '',
    );
  if (match?.[1] === undefined || match[2] === undefined) {
    return fallback;
  }
  const image: Buffer | null = await steamIcon(
    match[1],
    match[2],
    fetcher,
  ).catch((): null => null);
  if (image === null) {
    return fallback;
  }
  await mkdir(join(directory, 'steam'), { recursive: true });
  await writeFile(
    join(directory, 'steam', `${match[1]}-${match[2]}.jpg`),
    image,
  );
  return data;
}
