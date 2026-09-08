import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import type { Observable } from 'rxjs';
import { catchError, map, of, shareReplay, switchMap, timer } from 'rxjs';
import type { SiteConfigDto } from '../declarations/dtos/site-config.dto';
import type { LocationDto } from '../declarations/dtos/location.dto';
import { resolveLocation } from '../functions/resolve-location.function';
import { SiteRequestService } from './requests/site-request.service';
@Injectable({ providedIn: 'root' })
export class SiteService {
  private readonly requests: SiteRequestService = inject(SiteRequestService);
  private readonly browser: boolean = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly config: Observable<SiteConfigDto | null> = (this.browser
    ? timer(0, 3600000).pipe(
        switchMap((): Observable<SiteConfigDto | null> =>
          this.requests
            .config()
            .pipe(catchError((): Observable<null> => of(null))),
        ),
      )
    : of(null)
  ).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  public readonly locationChanges: Observable<LocationDto | null> =
    this.config.pipe(
      switchMap(
        (config: SiteConfigDto | null): Observable<LocationDto | null> => {
          const name: string = config?.location.trim() ?? '';
          return name.length === 0
            ? of(null)
            : this.requests.location(name).pipe(
                map(resolveLocation),
                catchError((): Observable<null> => of(null)),
              );
        },
      ),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  public readonly location: Signal<LocationDto | null | undefined> = toSignal(
    this.locationChanges,
  );
}
