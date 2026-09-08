import type { WeatherCondition } from '../declarations/types/weather-condition.type';

export function weatherCondition(code: number): WeatherCondition {
  if (code === 0) {
    return 'sun';
  }
  if ([1, 2, 3].includes(code)) {
    return 'cloud';
  }
  if ([45, 48].includes(code)) {
    return 'fog';
  }
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return 'rain';
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return 'snow';
  }
  if ([95, 96, 99].includes(code)) {
    return 'storm';
  }
  throw new Error('invalid_weather_code');
}
