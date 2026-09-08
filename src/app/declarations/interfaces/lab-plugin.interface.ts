import type { Type } from '@angular/core';
export interface LabPlugin {
  readonly id: string;
  readonly component: Type<unknown>;
}
