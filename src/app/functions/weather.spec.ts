import { describe, expect, it } from 'vitest';
import { resolveWeather } from './resolve-weather.function';
import { resolveLocation } from './resolve-location.function';
import { weatherCondition } from './weather-condition.function';
describe('location and weather', (): void => {
  it('keeps the timezone and coordinates from the same geocoding result', (): void => {
    expect(
      resolveLocation({
        results: [
          {
            name: 'Tokyo',
            timezone: 'Asia/Tokyo',
            latitude: 35.7,
            longitude: 139.7,
          },
        ],
      }),
    ).toEqual({
      name: 'Tokyo',
      timezone: 'Asia/Tokyo',
      latitude: 35.7,
      longitude: 139.7,
    });
    expect((): unknown => resolveLocation({ results: [] })).toThrow(
      'location_not_found',
    );
    expect((): unknown =>
      resolveLocation({
        results: [
          { name: 'City', timezone: 'Invalid/Zone', latitude: 0, longitude: 0 },
        ],
      }),
    ).toThrow();
  });
  it.each([0, 100])(
    'accepts boundary humidity %s',
    (humidity: number): void => {
      expect(
        resolveWeather({
          current: {
            temperature_2m: 0,
            relative_humidity_2m: humidity,
            weather_code: 45,
          },
        }),
      ).toEqual({ state: 'active', value: 0, humidity, weather: 'fog' });
    },
  );
  it.each([-1, 101, null])(
    'rejects invalid humidity %s',
    (humidity: number | null): void => {
      expect((): unknown =>
        resolveWeather({
          current: {
            temperature_2m: 0,
            relative_humidity_2m: humidity,
            weather_code: 0,
          },
        }),
      ).toThrow('invalid_weather');
    },
  );
  it('distinguishes all supported weather graphics', (): void => {
    expect([0, 3, 48, 65, 86, 99].map(weatherCondition)).toEqual([
      'sun',
      'cloud',
      'fog',
      'rain',
      'snow',
      'storm',
    ]);
    expect((): string => weatherCondition(999)).toThrow('invalid_weather_code');
  });
});
