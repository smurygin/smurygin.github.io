import type { WeatherCondition } from '../types/weather-condition.type';

export interface IntegrationDto {
  readonly state: 'active' | 'idle';
  readonly title?: string;
  readonly value?: number;
  readonly detail?: string;
  readonly artworkUrl?: string;
  readonly weather?: WeatherCondition;
  readonly humidity?: number;
  readonly album?: string;
  readonly playedAt?: string;
  readonly url?: string;
  readonly appId?: number;
}
