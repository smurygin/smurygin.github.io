import type { LocationDto } from '../declarations/dtos/location.dto';
import { record } from './record.function';
export function resolveLocation(payload: unknown): LocationDto {
  const results: unknown = record(payload)['results'];
  const place: Record<string, unknown> = record(
    Array.isArray(results) ? results[0] : undefined,
  );
  if (
    typeof place['name'] !== 'string' ||
    typeof place['timezone'] !== 'string' ||
    typeof place['latitude'] !== 'number' ||
    typeof place['longitude'] !== 'number' ||
    !Number.isFinite(place['latitude']) ||
    !Number.isFinite(place['longitude']) ||
    Math.abs(place['latitude']) > 90 ||
    Math.abs(place['longitude']) > 180
  ) {
    throw new Error('location_not_found');
  }
  new Intl.DateTimeFormat('en', { timeZone: place['timezone'] }).format();
  return {
    name: place['name'],
    timezone: place['timezone'],
    latitude: place['latitude'],
    longitude: place['longitude'],
  };
}
