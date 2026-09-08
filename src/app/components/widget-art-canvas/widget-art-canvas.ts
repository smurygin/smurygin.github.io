import { TextService } from '../../services/text.service';
import type { InputSignal } from '@angular/core';
import type { Signal } from '@angular/core';

import type { ElementRef } from '@angular/core';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  viewChild,
  untracked,
} from '@angular/core';
import type { WidgetViewModel } from '../../declarations/interfaces/widget-view-model.interface';
import { CanvasArtService } from '../../services/canvas-art.service';

@Component({
  selector: 'app-widget-art-canvas',
  template:
    '<canvas #canvas class="widget-art" tabindex="0" role="img" [attr.aria-label]="ariaLabel()"></canvas>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WidgetArtCanvas {
  public readonly widget: InputSignal<WidgetViewModel> =
    input.required<WidgetViewModel>();
  private readonly i18n: TextService = inject(TextService);
  protected readonly ariaLabel: Signal<string> = computed(
    (): string =>
      `${this.widget().artLabel ?? ''}. ${this.i18n.instant('rippleHint')}`,
  );
  private readonly art: CanvasArtService = inject(CanvasArtService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly canvas: Signal<ElementRef<HTMLCanvasElement>> =
    viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  public constructor() {
    afterRenderEffect((): void => {
      const canvas: HTMLCanvasElement = this.canvas().nativeElement;
      const widget: WidgetViewModel = this.widget();
      untracked((): void => {
        void this.art.attach(canvas, widget);
      });
    });
    this.destroyRef.onDestroy((): void => {
      this.art.detach(this.canvas().nativeElement);
    });
  }
}
