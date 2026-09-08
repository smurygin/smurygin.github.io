import type { InputSignal } from '@angular/core';
import type { Signal } from '@angular/core';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import type { ProfileContent } from '../../declarations/interfaces/profile-content.interface';

@Component({
  selector: 'app-signature',
  template: `<div
    class="signature"
    role="img"
    [attr.aria-label]="label()"
  >
    <span aria-hidden="true">{{ profile().first }}</span>
    <svg
      class="signature-cut"
      viewBox="0 0 10 24"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M7 0H10L3 24H0L3 14H6L7 10H4Z"
      />
    </svg>
    <span
      class="surname"
      aria-hidden="true"
      [attr.data-text]="profile().last"
      >{{ profile().last }}</span
    >
  </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Signature {
  public readonly profile: InputSignal<ProfileContent> =
    input.required<ProfileContent>();
  protected readonly label: Signal<string> = computed((): string =>
    `${this.profile().first} ${this.profile().last}`.trim(),
  );
}
