import { InjectionToken } from '@angular/core';
import type { LabPlugin } from '../../declarations/interfaces/lab-plugin.interface';

export const LAB_PLUGINS: InjectionToken<readonly LabPlugin[]> =
  new InjectionToken<readonly LabPlugin[]>('LAB_PLUGINS');
