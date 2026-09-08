import { IntegrationConfigurationError } from '../declarations/classes/integration-configuration.error';

export function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new IntegrationConfigurationError(`${name} is not configured`);
  }
  return value;
}
