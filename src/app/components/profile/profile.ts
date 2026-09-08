import type { InputSignal } from '@angular/core';
import type { Signal } from '@angular/core';

import { TranslatePipe } from '@ngx-translate/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import type { ProfileContent } from '../../declarations/interfaces/profile-content.interface';

@Component({
  selector: 'app-profile',
  imports: [TranslatePipe],
  templateUrl: './profile.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile {
  public readonly profile: InputSignal<ProfileContent> =
    input.required<ProfileContent>();
  protected readonly role: Signal<string> = computed((): string =>
    this.profile().role.trim(),
  );
  protected readonly company: Signal<string> = computed((): string =>
    this.profile().workplace.name.trim(),
  );
  protected readonly webUrl: (value: string) => string | null = (
    value: string,
  ): string | null => {
    try {
      const url: URL = new URL(value);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  };
  protected readonly emailUrl: Signal<string | null> = computed(
    (): string | null =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.profile().email)
        ? `mailto:${this.profile().email}`
        : null,
  );
}
