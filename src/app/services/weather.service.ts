import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { catchError, map, of, switchMap, timer } from 'rxjs';
import type { IntegrationDto } from '../declarations/dtos/integration.dto';
import type { LocationDto } from '../declarations/dtos/location.dto';
import { resolveWeather } from '../functions/resolve-weather.function';
import { SiteService } from './site.service';
import { SiteRequestService } from './requests/site-request.service';
@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly requests: SiteRequestService = inject(SiteRequestService);
  public readonly data: Observable<IntegrationDto | null> = inject(
    SiteService,
  ).locationChanges.pipe(
    switchMap((place: LocationDto | null): Observable<IntegrationDto | null> =>
      place === null
        ? of(null)
        : timer(0, 600000).pipe(
            switchMap((): Observable<IntegrationDto | null> =>
              this.requests.weather(place).pipe(
                map(resolveWeather),
                catchError((): Observable<null> => of(null)),
              ),
            ),
          ),
    ),
  );
}
