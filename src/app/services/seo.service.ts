import { PROFILE } from '../constants/profile.const';
import { TextService } from './text.service';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title: Title = inject(Title);
  private readonly meta: Meta = inject(Meta);
  private readonly i18n: TextService = inject(TextService);
  public apply(): void {
    const title: string = this.i18n.instant('seoTitle', {
      first: PROFILE.first,
      last: PROFILE.last,
    });
    const description: string = this.i18n.instant('seoDescription');
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: 'noindex,nofollow' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
  }
}
