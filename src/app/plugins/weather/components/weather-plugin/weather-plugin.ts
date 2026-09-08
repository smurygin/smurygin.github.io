import { TextService } from '../../../../services/text.service';
import type { IntegrationDto } from '../../../../declarations/dtos/integration.dto';
import type { Signal } from '@angular/core';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { WidgetCard } from '../../../../components/widget-card/widget-card';
import type { WidgetViewModel } from '../../../../declarations/interfaces/widget-view-model.interface';
import { WeatherService } from '../../../../services/weather.service';
@Component({
  selector: 'app-weather-plugin',
  imports: [WidgetCard, TranslatePipe],
  template: `<app-widget-card [widget]="view()"
    ><a
      class="widget-note"
      href="https://open-meteo.com/"
      target="_blank"
      rel="noopener noreferrer"
      >{{ 'weatherCredit' | translate }}</a
    ></app-widget-card
  >`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherPlugin {
  private readonly requests: WeatherService = inject(WeatherService);
  private readonly i18n: TextService = inject(TextService);
  private readonly data: Signal<IntegrationDto | null | undefined> = toSignal(
    this.requests.data,
  );
  protected readonly view: Signal<WidgetViewModel> = computed<WidgetViewModel>(
    (): WidgetViewModel => {
      const data: IntegrationDto | null | undefined = this.data();
      if (data === undefined) {
        return { label: this.t('weather'), secondary: this.t('loading') };
      }
      if (data === null) {
        return { label: this.t('weather'), secondary: this.t('unavailable') };
      }
      if (data.state === 'idle') {
        return { label: this.t('weather'), secondary: this.t('noWeatherData') };
      }
      return {
        label: this.t('weather'),
        art: 'weather',
        artLabel: this.t(data.weather ?? 'cloud'),
        weather: data.weather ?? 'cloud',
        numeric: true,
        main: this.i18n.instant('temperature', { value: data.value }),
        secondary: this.t(data.weather ?? 'cloud'),
        detail:
          data.humidity === undefined
            ? this.t('humidityUnavailable')
            : this.i18n.instant('humidity', {
                value: Math.round(data.humidity),
              }),
      };
    },
  );
  private t(key: string): string {
    return this.i18n.instant(key);
  }
}
