import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { timeout } from 'rxjs';
import type { SiteConfigDto } from '../../declarations/dtos/site-config.dto';
import type { IntegrationSnapshotDto } from '../../declarations/dtos/integration-snapshot.dto';
import type { LocationDto } from '../../declarations/dtos/location.dto';
@Injectable({ providedIn: 'root' })
export class SiteRequestService {
  private readonly http: HttpClient = inject(HttpClient);
  public config(): Observable<SiteConfigDto> {
    return this.http
      .get<SiteConfigDto>('/site-config.json', { transferCache: false })
      .pipe(timeout(8000));
  }
  public location(name: string): Observable<unknown> {
    return this.http
      .get<unknown>('https://geocoding-api.open-meteo.com/v1/search', {
        params: { name, count: '1', language: 'en' },
      })
      .pipe(timeout(8000));
  }
  public weather(place: LocationDto): Observable<unknown> {
    return this.http
      .get<unknown>('https://api.open-meteo.com/v1/forecast', {
        params: {
          latitude: String(place.latitude),
          longitude: String(place.longitude),
          timezone: place.timezone,
          current: 'temperature_2m,relative_humidity_2m,weather_code',
          temperature_unit: 'celsius',
        },
      })
      .pipe(timeout(8000));
  }
  public integration(id: string): Observable<IntegrationSnapshotDto> {
    return this.http
      .get<IntegrationSnapshotDto>(`/data/${encodeURIComponent(id)}.json`, {
        transferCache: false,
        params: { v: String(Math.floor(Date.now() / 60000)) },
      })
      .pipe(timeout(8000));
  }
}
