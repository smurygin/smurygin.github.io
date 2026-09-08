import type { InputSignal } from '@angular/core';
import type { OutputEmitterRef } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import type { Signal } from '@angular/core';

import { NgComponentOutlet } from '@angular/common';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { ElementRef } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MotionService } from '../../services/motion.service';
import { LabPluginRegistry } from '../../services/lab-plugin-registry.service';
@Component({
  selector: 'app-lab-panel',
  imports: [NgComponentOutlet, TranslatePipe],
  templateUrl: './lab-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabPanel {
  public readonly open: InputSignal<boolean> = input.required<boolean>();
  public readonly closeRequested: OutputEmitterRef<void> = output();
  protected readonly registry: LabPluginRegistry = inject(LabPluginRegistry);
  private readonly dialog: Signal<ElementRef<HTMLDialogElement>> =
    viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly renderedState: WritableSignal<boolean> = signal(false);
  protected readonly rendered: Signal<boolean> =
    this.renderedState.asReadonly();
  private readonly motion: MotionService = inject(MotionService);
  private readonly animation: WritableSignal<Animation | null> = signal(null);

  public constructor() {
    inject(DestroyRef).onDestroy((): void => {
      this.animation()?.cancel();
    });
    afterRenderEffect((): void => {
      const open: boolean = this.open();
      const rendered: boolean = this.rendered();
      const paused: boolean = this.motion.paused();
      untracked((): void => {
        this.synchronize(open, rendered, paused);
      });
    });
  }

  private synchronize(open: boolean, rendered: boolean, paused: boolean): void {
    const dialog: HTMLDialogElement = this.dialog().nativeElement;
    if (open && !rendered) {
      this.renderedState.set(true);
      return;
    }
    if (!open && !dialog.open) {
      this.renderedState.set(false);
      return;
    }
    const closing: boolean = dialog.getAttribute('data-phase') === 'closing';
    if (open && dialog.open && !closing) {
      if (paused) {
        this.animation()?.finish();
      }
      return;
    }
    if (!open && closing && !paused) {
      return;
    }
    const from: string = dialog.open
      ? (dialog.ownerDocument.defaultView?.getComputedStyle(dialog).transform ??
        'none')
      : 'translateY(calc(100% + 10px))';
    this.animation()?.cancel();
    this.animation.set(null);
    if (open && !dialog.open) {
      dialog.showModal();
    }
    dialog.setAttribute('data-phase', open ? 'open' : 'closing');
    if (paused) {
      if (!open) {
        this.finishClose(dialog);
      }
      return;
    }
    const animation: Animation = dialog.animate(
      [
        { transform: from },
        { transform: open ? 'translateY(0)' : 'translateY(calc(100% + 10px))' },
      ],
      {
        duration: open ? 320 : 180,
        easing: open
          ? 'cubic-bezier(0.16, 1, 0.3, 1)'
          : 'cubic-bezier(0.4, 0, 1, 1)',
        fill: 'forwards',
      },
    );
    this.animation.set(animation);
    void animation.finished.then(
      (): void => {
        if (this.animation() !== animation) {
          return;
        }
        if (!this.open()) {
          this.finishClose(dialog);
        }
        animation.cancel();
        this.animation.set(null);
      },
      (): void => {
        /* A new interaction may interrupt this transition. */
      },
    );
  }

  private finishClose(dialog: HTMLDialogElement): void {
    dialog.close();
    this.renderedState.set(false);
  }

  protected cancel(event: Event): void {
    event.preventDefault();
    this.closeRequested.emit();
  }
  protected backdropClick(event: MouseEvent): void {
    const dialog: HTMLDialogElement = this.dialog().nativeElement;
    if (event.target !== dialog) {
      return;
    }
    const bounds: DOMRect = dialog.getBoundingClientRect();
    if (
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom ||
      event.clientX < bounds.left ||
      event.clientX > bounds.right
    ) {
      this.closeRequested.emit();
    }
  }
}
