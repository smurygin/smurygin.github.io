import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  DestroyRef,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import type { ThemePreference } from '../declarations/types/theme-preference.type';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document: Document = inject(DOCUMENT);
  private readonly meta: Meta = inject(Meta);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly value: WritableSignal<ThemePreference> = signal('system');
  public readonly preference: Signal<ThemePreference> = this.value.asReadonly();

  public constructor() {
    afterNextRender((): void => {
      const window: (Window & typeof globalThis) | null =
        this.document.defaultView;
      if (!window) {
        return;
      }
      this.restore(this.document.documentElement.getAttribute('data-theme'));
      const media: MediaQueryList = window.matchMedia(
        '(prefers-color-scheme: dark)',
      );
      const systemChanged: () => void = (): void => {
        this.apply();
      };
      const storageChanged: (event: StorageEvent) => void = (
        event: StorageEvent,
      ): void => {
        if (event.key === 'theme' || event.key === null) {
          this.restore(event.newValue);
        }
      };
      media.addEventListener('change', systemChanged);
      window.addEventListener('storage', storageChanged);
      this.destroyRef.onDestroy((): void => {
        media.removeEventListener('change', systemChanged);
        window.removeEventListener('storage', storageChanged);
      });
    });
  }

  public cycle(): void {
    const next: Readonly<Record<ThemePreference, ThemePreference>> = {
      system: 'light',
      light: 'dark',
      dark: 'system',
    };
    this.select(next[this.value()]);
  }

  private select(value: ThemePreference): void {
    this.value.set(value);
    this.apply();
    try {
      if (value === 'system') {
        this.document.defaultView?.localStorage.removeItem('theme');
      } else {
        this.document.defaultView?.localStorage.setItem('theme', value);
      }
    } catch {
      // The selection still works when browser storage is unavailable.
    }
  }

  private restore(value: string | null): void {
    this.value.set(value === 'light' || value === 'dark' ? value : 'system');
    this.apply();
  }

  private apply(): void {
    this.document.documentElement.setAttribute('data-theme', this.value());
    const dark: boolean =
      this.value() === 'dark' ||
      (this.value() === 'system' &&
        (this.document.defaultView?.matchMedia('(prefers-color-scheme: dark)')
          .matches ??
          false));
    this.meta.updateTag({
      name: 'theme-color',
      content: dark ? '#243a1f' : '#b7c77d',
    });
  }
}
