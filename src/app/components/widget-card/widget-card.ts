import type { InputSignal } from '@angular/core';

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { WidgetViewModel } from '../../declarations/interfaces/widget-view-model.interface';
import { WidgetArtCanvas } from '../widget-art-canvas/widget-art-canvas';
@Component({
  selector: 'app-widget-card',
  imports: [WidgetArtCanvas],
  templateUrl: './widget-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WidgetCard {
  public readonly widget: InputSignal<WidgetViewModel> =
    input.required<WidgetViewModel>();
}
