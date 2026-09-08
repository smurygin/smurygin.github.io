import type { IntegrationDto } from './integration.dto';
export interface IntegrationSnapshotDto {
  readonly updatedAt: string | null;
  readonly data: IntegrationDto | null;
}
