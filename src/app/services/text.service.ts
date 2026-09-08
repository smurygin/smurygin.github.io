import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import type { InterpolationParameters } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class TextService {
  private readonly translations: TranslateService = inject(TranslateService);

  public instant(key: string, parameters?: InterpolationParameters): string {
    const value: unknown = this.translations.instant(key, parameters);
    if (typeof value !== 'string') {
      throw new TypeError(`Translation must be a string: ${key}`);
    }
    return value;
  }
}
