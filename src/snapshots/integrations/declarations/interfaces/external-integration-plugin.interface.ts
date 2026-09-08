import type { IntegrationDto } from '../../../../app/declarations/dtos/integration.dto';
export interface ExternalIntegrationPlugin {
  readonly id: string;
  readonly load: (signal: AbortSignal) => Promise<IntegrationDto>;
}
