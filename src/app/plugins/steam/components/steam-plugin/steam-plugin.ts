import type { IntegrationSnapshotDto } from '../../../../declarations/dtos/integration-snapshot.dto';
import { TextService } from '../../../../services/text.service';
import type { IntegrationDto } from '../../../../declarations/dtos/integration.dto';
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
import { SnapshotService } from '../../../../services/snapshot.service';
@Component({
  selector: 'app-steam-plugin',
  imports: [WidgetCard],
  template: `<app-widget-card [widget]="view()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SteamPlugin {
  private readonly requests: SnapshotService = inject(SnapshotService);
  private readonly i18n: TextService = inject(TextService);
  private readonly data: Signal<IntegrationSnapshotDto | null | undefined> =
    toSignal(this.requests.read('steam'));
  protected readonly view: Signal<WidgetViewModel> = computed<WidgetViewModel>(
    (): WidgetViewModel => {
      const snapshot: IntegrationSnapshotDto | null | undefined = this.data();
      const data: IntegrationDto | null | undefined =
        snapshot === undefined ? undefined : (snapshot?.data ?? null);
      if (data === undefined) {
        return { label: this.t('steam'), secondary: this.t('loading') };
      }
      if (data === null) {
        return { label: this.t('steam'), secondary: this.t('unavailable') };
      }
      if (data.state === 'idle') {
        return {
          label: this.t('steam'),
          secondary: this.t('noRecentGames'),
          status: snapshot == null ? '' : this.requests.note(snapshot),
        };
      }
      return {
        label: this.t('steam'),
        status: snapshot == null ? '' : this.requests.note(snapshot),
        art: 'steam',
        ...(data.artworkUrl === undefined ? {} : { artIcon: data.artworkUrl }),
        ...(data.appId === undefined ? {} : { artSeed: data.appId }),
        artLabel: data.title ?? '',
        main: data.title ?? '',
        secondary: this.i18n.instant('hours', { hours: data.value }),
      };
    },
  );
  private t(key: string): string {
    return this.i18n.instant(key);
  }
}
