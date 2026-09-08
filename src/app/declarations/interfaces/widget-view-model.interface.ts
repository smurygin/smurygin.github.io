import type { WeatherCondition } from '../types/weather-condition.type';

export interface WidgetViewModel {
  readonly label: string;
  readonly art?: 'time' | 'weather' | 'steam' | 'music';
  readonly artLabel?: string;
  readonly artIcon?: string;
  readonly artSeed?: number;
  readonly weather?: WeatherCondition;
  readonly detail?: string;
  readonly caption?: string;
  readonly status?: string;
  readonly url?: string;
  readonly playing?: boolean;
  readonly zone?: string;
  readonly main?: string;
  readonly secondary: string;
  readonly numeric?: boolean;
}
