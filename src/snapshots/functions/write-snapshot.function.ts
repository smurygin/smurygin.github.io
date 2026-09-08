import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { IntegrationDto } from '../../app/declarations/dtos/integration.dto';
import type { IntegrationSnapshotDto } from '../../app/declarations/dtos/integration-snapshot.dto';
export async function writeSnapshot(
  directory: string,
  id: string,
  load: () => Promise<IntegrationDto>,
): Promise<boolean> {
  if (!/^[a-z]+$/.test(id)) {
    throw new Error('invalid_snapshot_id');
  }
  const snapshot: IntegrationSnapshotDto = await load().then(
    (data: IntegrationDto): IntegrationSnapshotDto => ({
      updatedAt: new Date().toISOString(),
      data,
    }),
    (): IntegrationSnapshotDto => ({ updatedAt: null, data: null }),
  );
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, `${id}.json`),
    `${JSON.stringify(snapshot)}\n`,
  );
  return snapshot.data !== null;
}
