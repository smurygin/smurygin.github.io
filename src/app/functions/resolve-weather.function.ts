import type { IntegrationDto } from '../declarations/dtos/integration.dto';
import { record } from './record.function';
import { weatherCondition } from './weather-condition.function';
export function resolveWeather(payload: unknown): IntegrationDto {
  const current: Record<string, unknown> = record(record(payload)['current']);
  const temperature: unknown = current['temperature_2m'];
  const humidity: unknown = current['relative_humidity_2m'];
  const code: unknown = current['weather_code'];
  if (
    typeof temperature !== 'number' ||
    !Number.isFinite(temperature) ||
    typeof code !== 'number' ||
    typeof humidity !== 'number' ||
    !Number.isFinite(humidity) ||
    humidity < 0 ||
    humidity > 100
  ) {
    throw new Error('invalid_weather');
  }
  return {
    state: 'active',
    value: temperature,
    humidity,
    weather: weatherCondition(code),
  };
}
