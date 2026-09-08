import type { WeatherCondition } from '../declarations/types/weather-condition.type';
import type { WritableSignal } from '@angular/core';

import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import type { WidgetViewModel } from '../declarations/interfaces/widget-view-model.interface';
import { MotionService } from './motion.service';

interface ArtScene {
  draw(time: number, delta?: number): void;
  dispose(): void;
}
interface BackgroundController {
  dispose(): void;
}
type WidgetArtConstructor = new (
  canvas: HTMLCanvasElement,
  options: Record<string, unknown>,
) => ArtScene;
interface BackgroundModule {
  mountBackground(
    canvas: HTMLCanvasElement,
    options: Record<string, unknown>,
  ): BackgroundController | undefined;
}
interface WidgetModule {
  readonly WidgetArt: WidgetArtConstructor;
}
interface SteamModule {
  readonly SteamArt: WidgetArtConstructor;
}

function isBackgroundModule(value: unknown): value is BackgroundModule {
  return (
    typeof value === 'object' &&
    value !== null &&
    'mountBackground' in value &&
    typeof value.mountBackground === 'function'
  );
}

function isWidgetModule(value: unknown): value is WidgetModule {
  return (
    typeof value === 'object' &&
    value !== null &&
    'WidgetArt' in value &&
    typeof value.WidgetArt === 'function'
  );
}

function isSteamModule(value: unknown): value is SteamModule {
  return (
    typeof value === 'object' &&
    value !== null &&
    'SteamArt' in value &&
    typeof value.SteamArt === 'function'
  );
}

@Injectable({ providedIn: 'root' })
export class CanvasArtService {
  private readonly platformId: object = inject(PLATFORM_ID);
  private readonly document: Document = inject(DOCUMENT);
  private readonly site: MotionService = inject(MotionService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly scenes: WritableSignal<
    ReadonlyMap<
      HTMLCanvasElement,
      { readonly key: string; readonly scene: ArtScene }
    >
  > = signal<
    ReadonlyMap<
      HTMLCanvasElement,
      { readonly key: string; readonly scene: ArtScene }
    >
  >(new Map());
  private readonly generations: WritableSignal<
    ReadonlyMap<HTMLCanvasElement, symbol>
  > = signal<ReadonlyMap<HTMLCanvasElement, symbol>>(new Map());
  private readonly background: WritableSignal<
    BackgroundController | undefined
  > = signal<BackgroundController | undefined>(undefined);
  private readonly frame: WritableSignal<number | undefined> = signal<
    number | undefined
  >(undefined);
  private readonly previous: WritableSignal<number> = signal(0);
  private readonly visualTime: WritableSignal<number> = signal(0);

  public constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.frame.set(
        this.document.defaultView?.requestAnimationFrame(this.draw),
      );
    }
    this.destroyRef.onDestroy((): void => {
      this.dispose();
    });
  }

  public async mountBackground(
    canvas: HTMLCanvasElement,
    quietElement: HTMLElement,
  ): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || this.background()) {
      return;
    }
    const moduleUrl: string = '/art/background-art.mjs';
    const module: unknown = await import(/* @vite-ignore */ moduleUrl);
    if (!canvas.isConnected) {
      return;
    }
    if (!isBackgroundModule(module)) {
      throw new Error('Background art module is invalid');
    }
    this.background.set(
      module.mountBackground(canvas, {
        quietElement,
        quietElements: [
          '.work-copy',
          '.contact-links',
          '.signature',
          '.masthead-actions',
        ],
        paused: (): boolean => this.site.paused(),
      }),
    );
  }

  public async attach(
    canvas: HTMLCanvasElement,
    widget: WidgetViewModel,
  ): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !widget.art) {
      return;
    }
    const key: string = [
      widget.art,
      widget.artIcon,
      widget.artSeed,
      widget.weather,
      widget.zone,
      widget.playing,
    ].join('|');
    if (this.scenes().get(canvas)?.key === key) {
      return;
    }
    this.detach(canvas);
    const generation: symbol = Symbol();
    this.generations.update(
      (
        entries: ReadonlyMap<HTMLCanvasElement, symbol>,
      ): Map<HTMLCanvasElement, symbol> =>
        new Map([...entries, [canvas, generation]]),
    );
    const moduleUrl: string =
      widget.art === 'steam' ? '/art/steam-art.mjs' : '/art/widget-art.mjs';
    const module: unknown = await import(/* @vite-ignore */ moduleUrl);
    if (!canvas.isConnected || this.generations().get(canvas) !== generation) {
      return;
    }
    const Constructor: WidgetArtConstructor = this.artConstructor(
      widget.art,
      module,
    );
    const scene: ArtScene = new Constructor(
      canvas,
      widget.art === 'steam'
        ? {
            icon: widget.artIcon,
            seed: widget.artSeed,
            paused: (): boolean => this.site.paused(),
          }
        : {
            kind: widget.art,
            weather: (): WeatherCondition => widget.weather ?? 'cloud',
            paused: (): boolean => this.site.paused(),
            playing: (): boolean => widget.playing ?? false,
            zone: (): string => widget.zone ?? 'UTC',
          },
    );
    this.scenes.update(
      (
        entries: ReadonlyMap<
          HTMLCanvasElement,
          { readonly key: string; readonly scene: ArtScene }
        >,
      ): Map<
        HTMLCanvasElement,
        { readonly key: string; readonly scene: ArtScene }
      > => new Map([...entries, [canvas, { key, scene }]]),
    );
  }

  private artConstructor(kind: string, module: unknown): WidgetArtConstructor {
    if (kind === 'steam' && isSteamModule(module)) {
      return module.SteamArt;
    }
    if (kind !== 'steam' && isWidgetModule(module)) {
      return module.WidgetArt;
    }
    throw new Error('Invalid art module');
  }

  public detach(canvas: HTMLCanvasElement): void {
    this.generations.update(
      (
        entries: ReadonlyMap<HTMLCanvasElement, symbol>,
      ): Map<HTMLCanvasElement, symbol> =>
        new Map(
          [...entries].filter(
            ([element]: [HTMLCanvasElement, symbol]): boolean =>
              element !== canvas,
          ),
        ),
    );
    this.scenes().get(canvas)?.scene.dispose();
    this.scenes.update(
      (
        entries: ReadonlyMap<
          HTMLCanvasElement,
          { readonly key: string; readonly scene: ArtScene }
        >,
      ): Map<
        HTMLCanvasElement,
        { readonly key: string; readonly scene: ArtScene }
      > =>
        new Map(
          [...entries].filter(
            ([element]: [
              HTMLCanvasElement,
              { readonly key: string; readonly scene: ArtScene },
            ]): boolean => element !== canvas,
          ),
        ),
    );
  }

  private readonly draw: (time: number) => void = (time: number): void => {
    const window: (Window & typeof globalThis) | null =
      this.document.defaultView;
    if (!window) {
      return;
    }
    const delta: number = this.previous()
      ? Math.min((time - this.previous()) / 1000, 0.05)
      : 1 / 30;
    this.previous.set(time);
    if (!this.document.hidden) {
      if (!this.site.paused()) {
        this.visualTime.update((value: number): number => value + delta);
      }
      for (const { scene } of this.scenes().values()) {
        scene.draw(this.visualTime(), delta);
      }
    }
    this.frame.set(window.requestAnimationFrame(this.draw));
  };

  private dispose(): void {
    const window: (Window & typeof globalThis) | null =
      this.document.defaultView;
    if (window && this.frame() !== undefined) {
      window.cancelAnimationFrame(this.frame() ?? 0);
    }
    for (const { scene } of this.scenes().values()) {
      scene.dispose();
    }
    this.scenes.set(new Map());
    this.generations.set(new Map());
    this.background()?.dispose();
    this.background.set(undefined);
  }
}
