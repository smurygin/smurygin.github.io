import { inject, Injectable } from '@angular/core';
import { LAB_PLUGINS } from '../constants/tokens/lab-plugins.token';
import type { LabPlugin } from '../declarations/interfaces/lab-plugin.interface';
@Injectable({ providedIn: 'root' })
export class LabPluginRegistry {
  public readonly plugins: readonly LabPlugin[] = inject(LAB_PLUGINS);
}
