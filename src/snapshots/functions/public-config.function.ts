import type { IntegrationEnvironment } from '../integrations/declarations/interfaces/integration-environment.interface';
import type { SiteConfigDto } from '../../app/declarations/dtos/site-config.dto';
export function publicConfig(
  environment: IntegrationEnvironment,
  fallback: SiteConfigDto,
): SiteConfigDto {
  return {
    location: configured(environment.LOCATION, fallback.location),
  };
}

function configured(value: string | undefined, fallback: string): string {
  const trimmed: string = value?.trim() ?? '';
  return trimmed.length === 0 ? fallback : trimmed;
}
