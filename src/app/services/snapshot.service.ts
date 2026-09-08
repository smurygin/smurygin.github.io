import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap, timer } from 'rxjs';
import type { Observable } from 'rxjs';
import type { IntegrationSnapshotDto } from '../declarations/dtos/integration-snapshot.dto';
import { formatTimestamp } from '../functions/format-timestamp.function';
import { SiteRequestService } from './requests/site-request.service';
import { TextService } from './text.service';
@Injectable({ providedIn: 'root' })
export class SnapshotService {
  private readonly requests: SiteRequestService = inject(SiteRequestService);
  private readonly i18n: TextService = inject(TextService);
  private readonly browser: boolean = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly now: Signal<number> = toSignal(
    this.browser
      ? timer(0, 60000).pipe(map((): number => Date.now()))
      : of(Date.now()),
    { initialValue: Date.now() },
  );
  public read(id: string): Observable<IntegrationSnapshotDto | null> {
    return this.browser
      ? timer(0, 60000).pipe(
          switchMap((): Observable<IntegrationSnapshotDto | null> =>
            this.requests
              .integration(id)
              .pipe(catchError((): Observable<null> => of(null))),
          ),
        )
      : of(null);
  }
  public note(snapshot: IntegrationSnapshotDto): string {
    const timestamp: string | null = snapshot.updatedAt;
    if (timestamp === null || !Number.isFinite(Date.parse(timestamp))) {
      return this.i18n.instant('unavailable');
    }
    return this.i18n.instant(
      this.now() - Date.parse(timestamp) > 7200000
        ? 'snapshotOld'
        : 'snapshotUpdated',
      { time: formatTimestamp(timestamp) },
    );
  }
}
