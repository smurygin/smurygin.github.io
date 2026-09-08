import type { ApplicationRef } from '@angular/core';
import {
  bootstrapApplication,
  type BootstrapContext,
} from '@angular/platform-browser';
import { App } from './app/app';
import { config } from './app/app.config.server';

const bootstrap: (context: BootstrapContext) => Promise<ApplicationRef> = (
  context: BootstrapContext,
): Promise<ApplicationRef> => bootstrapApplication(App, config, context);

export default bootstrap;
