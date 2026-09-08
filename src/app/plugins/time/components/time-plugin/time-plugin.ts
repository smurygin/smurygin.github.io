import { TextService } from '../../../../services/text.service';
import type { LocationDto } from '../../../../declarations/dtos/location.dto';
import type { Signal } from '@angular/core';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { WidgetCard } from '../../../../components/widget-card/widget-card';
import type { WidgetViewModel } from '../../../../declarations/interfaces/widget-view-model.interface';
import { SiteService } from '../../../../services/site.service';
import { map, timer } from 'rxjs';
@Component({
  selector: 'app-time-plugin',
  imports: [WidgetCard],
  template: `<app-widget-card [widget]="view()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimePlugin {
  private readonly requests: SiteService = inject(SiteService);
  private readonly i18n: TextService = inject(TextService);
  private readonly now: Signal<Date> = toSignal(
    timer(0, 1000).pipe(map((): Date => new Date())),
    {
      initialValue: new Date(),
    },
  );
  protected readonly view: Signal<WidgetViewModel> = computed<WidgetViewModel>(
    (): WidgetViewModel => {
      const location: LocationDto | null | undefined = this.requests.location();
      if (location === undefined) {
        return { label: this.t('time'), secondary: this.t('loading') };
      }
      if (location === null) {
        return { label: this.t('time'), secondary: this.t('locationMissing') };
      }
      return {
        label: this.t('time'),
        art: 'time',
        artLabel: this.t('timeArtLabel'),
        zone: location.timezone,
        numeric: true,
        main: new Intl.DateTimeFormat('en-GB', {
          timeZone: location.timezone,
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        }).format(this.now()),
        secondary: location.name,
      };
    },
  );
  private t(key: string): string {
    return this.i18n.instant(key);
  }
}
