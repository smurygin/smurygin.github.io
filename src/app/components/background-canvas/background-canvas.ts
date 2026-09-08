import type { Signal } from '@angular/core';

import { DOCUMENT } from '@angular/common';
import type { ElementRef } from '@angular/core';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
  viewChild,
} from '@angular/core';
import { CanvasArtService } from '../../services/canvas-art.service';

@Component({
  selector: 'app-background-canvas',
  template: '<canvas #canvas aria-hidden="true"></canvas>',
  styles:
    ':host,canvas{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;image-rendering:pixelated}',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackgroundCanvas {
  private readonly art: CanvasArtService = inject(CanvasArtService);
  private readonly document: Document = inject(DOCUMENT);
  private readonly canvas: Signal<ElementRef<HTMLCanvasElement>> =
    viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  public constructor() {
    afterNextRender((): void => {
      const quietElement: HTMLElement | null =
        this.document.querySelector<HTMLElement>('.profile-intro');
      if (quietElement) {
        void this.art.mountBackground(
          this.canvas().nativeElement,
          quietElement,
        );
      }
    });
  }
}
