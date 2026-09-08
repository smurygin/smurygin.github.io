import type { IntegrationSnapshotDto } from '../../../../declarations/dtos/integration-snapshot.dto';
import { formatTimestamp } from '../../../../functions/format-timestamp.function';
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
  selector: 'app-spotify-plugin',
  imports: [WidgetCard],
  template: `<app-widget-card [widget]="view()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpotifyPlugin {
  private readonly requests: SnapshotService = inject(SnapshotService);
  private readonly i18n: TextService = inject(TextService);
  private readonly data: Signal<IntegrationSnapshotDto | null | undefined> =
    toSignal(this.requests.read('spotify'));
  protected readonly view: Signal<WidgetViewModel> = computed<WidgetViewModel>(
    (): WidgetViewModel => {
      const snapshot: IntegrationSnapshotDto | null | undefined = this.data();
      const data: IntegrationDto | null | undefined =
        snapshot === undefined ? undefined : (snapshot?.data ?? null);
      if (data === undefined) {
        return { label: this.t('spotify'), secondary: this.t('loading') };
      }
      if (data === null) {
        return { label: this.t('spotify'), secondary: this.t('unavailable') };
      }
      if (data.state === 'idle') {
        return {
          label: this.t('spotify'),
          secondary: this.t('noListeningHistory'),
          status: snapshot == null ? '' : this.requests.note(snapshot),
          art: 'music',
          playing: false,
          artLabel: this.t('noListeningHistory'),
        };
      }
      return {
        label: this.t('spotify'),
        status: snapshot == null ? '' : this.requests.note(snapshot),
        art: 'music',
        artLabel: this.t('spotifyArtLabel'),
        caption:
          data.playedAt === undefined
            ? this.t('lastPlayed')
            : this.i18n.instant('lastPlayedAt', {
                time: formatTimestamp(data.playedAt),
              }),
        playing: false,
        detail:
          data.album === undefined
            ? this.t('albumUnavailable')
            : this.i18n.instant('album', { name: data.album }),
        ...(data.url === undefined ? {} : { url: data.url }),
        main: data.title ?? '',
        secondary: data.detail ?? '',
      };
    },
  );
  private t(key: string): string {
    return this.i18n.instant(key);
  }
}
