import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class MotionService {
  private readonly value: WritableSignal<boolean> = signal(false);
  public readonly paused: Signal<boolean> = this.value.asReadonly();
  public constructor() {
    const document: Document = inject(DOCUMENT);
    const destroyRef: DestroyRef = inject(DestroyRef);
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      const media: MediaQueryList | undefined =
        document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)');
      this.value.set(media?.matches ?? false);
      const listener: (event: MediaQueryListEvent) => void = (
        event: MediaQueryListEvent,
      ): void => {
        this.value.set(event.matches);
      };
      media?.addEventListener('change', listener);
      destroyRef.onDestroy((): void => {
        media?.removeEventListener('change', listener);
      });
    }
  }
  public toggle(): void {
    this.value.update((paused: boolean): boolean => !paused);
  }
}
