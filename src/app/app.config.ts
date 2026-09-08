import type { LabPlugin } from './declarations/interfaces/lab-plugin.interface';
import { provideHttpClient } from '@angular/common/http';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import en from './i18n/en.json';
import type { ApplicationConfig } from '@angular/core';
import {
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { LAB_PLUGINS } from './constants/tokens/lab-plugins.token';
import { SpotifyPlugin } from './plugins/spotify/components/spotify-plugin/spotify-plugin';
import { SteamPlugin } from './plugins/steam/components/steam-plugin/steam-plugin';
import { TimePlugin } from './plugins/time/components/time-plugin/time-plugin';
import { WeatherPlugin } from './plugins/weather/components/weather-plugin/weather-plugin';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideHttpClient(),
    provideTranslateService({ lang: 'en', fallbackLang: 'en' }),
    provideAppInitializer((): void => {
      inject(TranslateService).setTranslation('en', en);
    }),
    {
      provide: LAB_PLUGINS,
      useValue: [
        { id: 'time', component: TimePlugin },
        { id: 'weather', component: WeatherPlugin },
        { id: 'steam', component: SteamPlugin },
        { id: 'spotify', component: SpotifyPlugin },
      ] satisfies readonly LabPlugin[],
    },
  ],
};
