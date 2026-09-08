import { PROFILE } from '../../src/app/constants/profile.const';
import type { Page, Route, Locator, Request } from '@playwright/test';

import { test, expect } from '@playwright/test';

test('renders the personal card and lab flow', async ({
  page,
}: {
  readonly page: Page;
}): Promise<void> => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Personal site/);
  await expect(page.getByRole('heading', { name: 'Hello.' })).toBeVisible();
  await page.getByRole('button', { name: 'Open lab' }).click();
  await expect(page.getByRole('dialog', { name: 'The lab' })).toBeVisible();
  await expect(page.locator('.widget-label')).toHaveText([
    'time',
    'weather',
    'steam',
    'spotify',
  ]);
  await expect(page.getByRole('button', { name: 'Customize' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Close lab' }).click();
  await expect(page.getByRole('button', { name: 'Open lab' })).toBeFocused();
  expect(
    await page.evaluate(
      (): boolean =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test('keeps the composition at 390px', async ({
  page,
}: {
  readonly page: Page;
}): Promise<void> => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Hello.' })).toBeVisible();
  expect(
    await page.evaluate(
      (): boolean =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Open lab' }).click();
  await expect(page.locator('.widget')).toHaveCount(4);
});

test('shows static snapshots and direct weather requests without server routes', async ({
  page,
}: {
  readonly page: Page;
}): Promise<void> => {
  await page.route(
    '**/site-config.json',
    async (route: Route): Promise<void> => {
      await route.fulfill({
        json: {
          location: 'Lisbon',
        },
      });
    },
  );
  await page.route(
    'https://geocoding-api.open-meteo.com/v1/search?**',
    async (route: Route): Promise<void> => {
      await route.fulfill({
        json: {
          results: [
            {
              name: 'Lisbon',
              latitude: 38.7,
              longitude: -9.1,
              timezone: 'Europe/Lisbon',
            },
          ],
        },
      });
    },
  );
  await page.route(
    'https://api.open-meteo.com/v1/forecast?**',
    async (route: Route): Promise<void> => {
      await route.fulfill({
        json: {
          current: {
            temperature_2m: 21,
            relative_humidity_2m: 63,
            weather_code: 0,
          },
        },
      });
    },
  );
  await page.route(
    '**/data/steam/test-game.svg',
    async (route: Route): Promise<void> => {
      await route.fulfill({
        contentType: 'image/svg+xml',
        path: 'e2e/fixtures/test-game.svg',
      });
    },
  );
  await page.route(
    '**/data/steam.json?**',
    async (route: Route): Promise<void> => {
      await route.fulfill({
        json: {
          updatedAt: new Date().toISOString(),
          data: {
            state: 'active',
            title: 'Example game',
            value: 24.8,
            appId: 1,
            artworkUrl: '/data/steam/test-game.svg',
          },
        },
      });
    },
  );
  await page.route(
    '**/data/spotify.json?**',
    async (route: Route): Promise<void> => {
      await route.fulfill({
        json: {
          updatedAt: new Date().toISOString(),
          data: {
            state: 'active',
            title: 'Example track',
            detail: 'Example artist',
            album: 'Example album',
            url: 'https://open.spotify.com/track/123',
            playedAt: '2026-09-08T10:00:00.000Z',
          },
        },
      });
    },
  );
  page.on('request', (request: Request): void => {
    expect(new URL(request.url()).pathname).not.toMatch(/^\/api\//);
  });
  page.on('pageerror', (error: Error): void => {
    throw error;
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open lab' }).click();
  await expect(
    page.getByRole('link', { name: PROFILE.workplace.name }),
  ).toHaveAttribute('href', PROFILE.workplace.url);
  await expect(page.getByText('21 °C')).toBeVisible();
  await expect(page.getByText('24.8 h played')).toBeVisible();
  await expect(
    page.getByRole('article', { name: 'steam', exact: true }).locator('canvas'),
  ).toHaveAttribute('data-art-source', 'icon');
  await expect(page.getByText('Humidity 63%')).toBeVisible();
  await expect(page.getByText('Album: Example album')).toBeVisible();
  await expect(page.getByText('Example track')).toBeVisible();
  await expect(page.getByText(/Played:.*8 Sept 2026/)).toBeVisible();
  await expect(page.getByText('Lisbon', { exact: true })).toBeVisible();
  await page.screenshot({
    path: 'test-results/lab-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText('21 °C')).toBeVisible();
  await page.screenshot({
    path: 'test-results/lab-mobile.png',
    fullPage: true,
  });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open lab' })).toBeFocused();
  await page.getByRole('button', { name: 'Open lab' }).click();
  await expect(page.getByText('Example track')).toBeVisible();
});

test('shows empty history with record graphics, then loads a last played snapshot', async ({
  page,
}: {
  readonly page: Page;
}): Promise<void> => {
  await page.clock.install();
  await page.route(
    '**/data/spotify.json?**',
    async (route: Route): Promise<void> => {
      await route.fulfill({
        json: { updatedAt: new Date().toISOString(), data: { state: 'idle' } },
      });
    },
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Open lab' }).click();
  const spotify: Locator = page.getByRole('article', {
    name: 'spotify',
    exact: true,
  });
  await expect(spotify.getByText('No tracks yet')).toBeVisible();
  await expect(
    spotify.getByRole('img', { name: /No tracks yet/ }),
  ).toBeVisible();
  await expect(spotify.locator('canvas')).toHaveAttribute(
    'data-playback',
    'idle',
  );
  await page.screenshot({
    path: 'test-results/spotify-idle-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'test-results/spotify-idle-mobile.png',
    fullPage: true,
  });
  await page.unroute('**/data/spotify.json?**');
  await page.route(
    '**/data/spotify.json?**',
    async (route: Route): Promise<void> => {
      await route.fulfill({
        json: {
          updatedAt: new Date().toISOString(),
          data: {
            state: 'active',
            title: 'New track',
            detail: 'Artist',
            album: 'New album',
            playedAt: '2026-09-08T10:00:00.000Z',
          },
        },
      });
    },
  );
  await page.clock.fastForward(61000);
  await expect(spotify.getByText('New track')).toBeVisible();
  await expect(spotify.getByText('Album: New album')).toBeVisible();
  await expect(spotify.locator('canvas')).toHaveAttribute(
    'data-playback',
    'idle',
  );
  await expect(spotify.getByRole('img', { name: /No tracks yet/ })).toHaveCount(
    0,
  );
});

test('shows service failure separately from empty history', async ({
  page,
}: {
  readonly page: Page;
}): Promise<void> => {
  await page.route(
    '**/data/spotify.json?**',
    async (route: Route): Promise<void> => {
      await route.fulfill({ status: 502, json: { error: 'upstream_failed' } });
    },
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Open lab' }).click();
  const spotify: Locator = page.getByRole('article', {
    name: 'spotify',
    exact: true,
  });
  await expect(spotify.getByText('No data')).toBeVisible();
  await expect(spotify.getByText('No tracks yet')).toHaveCount(0);
});

test('uses the configured timezone instead of the visitor timezone', async ({
  page,
}: {
  readonly page: Page;
}): Promise<void> => {
  await page.clock.setFixedTime(new Date('2026-01-01T12:00:00Z'));
  await page.route(
    '**/site-config.json',
    async (route: Route): Promise<void> => {
      await route.fulfill({
        json: { location: 'Tokyo' },
      });
    },
  );
  await page.route(
    'https://geocoding-api.open-meteo.com/v1/search?**',
    async (route: Route): Promise<void> => {
      await route.fulfill({
        json: {
          results: [
            {
              name: 'Tokyo',
              timezone: 'Asia/Tokyo',
              latitude: 35.7,
              longitude: 139.7,
            },
          ],
        },
      });
    },
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Open lab' }).click();
  const time: Locator = page.getByRole('article', {
    name: 'time',
    exact: true,
  });
  await expect(time.getByText('21:00')).toBeVisible();
  await expect(time.getByText('Tokyo')).toBeVisible();
});

test('marks an old snapshot as delayed instead of implying live playback', async ({
  page,
}: {
  readonly page: Page;
}): Promise<void> => {
  await page.clock.setFixedTime(new Date('2026-09-08T15:00:00Z'));
  await page.route(
    '**/data/spotify.json?**',
    async (route: Route): Promise<void> => {
      await route.fulfill({
        json: {
          updatedAt: '2026-09-08T10:00:00Z',
          data: {
            state: 'active',
            title: 'Older track',
            detail: 'Artist',
            album: 'Album',
            playedAt: '2026-09-07T20:00:00Z',
          },
        },
      });
    },
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Open lab' }).click();
  await expect(page.getByText(/Update delayed/)).toBeVisible();
  await expect(page.getByText(/Played:.*7 Sept 2026/)).toBeVisible();
});
