import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { describe, expect, it } from 'vitest';
import { PROFILE } from '../../constants/profile.const';
import type { ProfileContent } from '../../declarations/interfaces/profile-content.interface';
import en from '../../i18n/en.json';
import { Profile } from './profile';

async function render(
  profile: ProfileContent,
): Promise<ComponentFixture<Profile>> {
  TestBed.configureTestingModule({
    imports: [Profile],
    providers: [provideTranslateService({ lang: 'en' })],
  });
  TestBed.inject(TranslateService).setTranslation('en', en);
  const fixture: ComponentFixture<Profile> = TestBed.createComponent(Profile);
  fixture.componentRef.setInput('profile', profile);
  await fixture.whenStable();
  return fixture;
}

describe('profile content', (): void => {
  it('omits missing work and invalid contacts without template placeholders', async (): Promise<void> => {
    const fixture: ComponentFixture<Profile> = await render({
      ...PROFILE,
      role: ' ',
      workplace: { name: ' ', url: '' },
      github: 'javascript:alert(1)',
      telegram: '',
      email: 'invalid',
    });
    const element: unknown = fixture.nativeElement;
    if (!(element instanceof HTMLElement)) {
      throw new TypeError('Expected a profile element');
    }
    expect(element.querySelector('.work-copy')).toBeNull();
    expect(element.querySelector('nav')).toBeNull();
    expect(element.querySelector('.pixel-rule')).toBeNull();
    expect(element.textContent).toContain(en.profileBio);
    expect(element.textContent).not.toMatch(
      /\[(Role|Company|GitHub|Telegram|Email)\]/,
    );
  });

  it('shows a workplace without an empty role or dangling connector', async (): Promise<void> => {
    const fixture: ComponentFixture<Profile> = await render({
      ...PROFILE,
      role: '',
      workplace: { name: 'Example company', url: 'https://example.com' },
    });
    const element: unknown = fixture.nativeElement;
    if (!(element instanceof HTMLElement)) {
      throw new TypeError('Expected a profile element');
    }
    const work: Element | null = element.querySelector('.work-copy');
    expect(work?.textContent).toContain('Example company');
    expect(work?.textContent).not.toMatch(/\bat\b|\[Role\]/);
    expect(work?.querySelector('a')?.getAttribute('href')).toBe(
      'https://example.com/',
    );
  });
});
