import type { ProfileContent } from './declarations/interfaces/profile-content.interface';
import type { Signal, WritableSignal } from '@angular/core';

import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { BackgroundCanvas } from './components/background-canvas/background-canvas';
import { LabPanel } from './components/lab-panel/lab-panel';
import { Profile } from './components/profile/profile';
import { Signature } from './components/signature/signature';
import { PROFILE } from './constants/profile.const';
import { ThemeService } from './services/theme.service';
import { MotionService } from './services/motion.service';
import { SeoService } from './services/seo.service';
@Component({
  selector: 'app-root',
  imports: [BackgroundCanvas, LabPanel, Profile, Signature, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-paused]': 'motion.paused()' },
})
export class App {
  protected readonly profile: ProfileContent = PROFILE;
  protected readonly theme: ThemeService = inject(ThemeService);
  protected readonly motion: MotionService = inject(MotionService);
  private readonly labOpenState: WritableSignal<boolean> = signal(false);
  protected readonly labOpen: Signal<boolean> = this.labOpenState.asReadonly();
  protected openLab(): void {
    this.labOpenState.set(true);
  }
  protected closeLab(): void {
    this.labOpenState.set(false);
  }
  public constructor() {
    inject(SeoService).apply();
  }
}
