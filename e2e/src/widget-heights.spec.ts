import { expect, test } from '@playwright/test';
import type { Page, Route, TestInfo } from '@playwright/test';

for (const width of [1280, 390]) {
  test(`matches all widget heights at ${String(width)}px`, async ({
    page,
  }: {
    readonly page: Page;
  }, testInfo: TestInfo): Promise<void> => {
    await page.setViewportSize({ width, height: 1400 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route(
      '**/site-config.json',
      async (route: Route): Promise<void> => {
        await route.fulfill({ json: { location: '' } });
      },
    );
    await page.route(
      '**/data/steam.json*',
      async (route: Route): Promise<void> => {
        await route.fulfill({ json: { updatedAt: null, data: null } });
      },
    );
    await page.route(
      '**/data/spotify.json*',
      async (route: Route): Promise<void> => {
        await route.fulfill({
          json: {
            updatedAt: new Date().toISOString(),
            data: {
              state: 'active',
              title: 'A long track title that wraps across several lines',
              detail: 'An artist with a longer display name',
              album: 'An album title with additional information',
              url: 'https://open.spotify.com/track/123',
              playedAt: '2026-09-08T10:00:00.000Z',
            },
          },
        });
      },
    );
    await page.goto('/');
    await page.getByRole('button', { name: 'Open lab' }).click();
    await expect(
      page.getByText('A long track title that wraps across several lines'),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open-Meteo' })).toBeVisible();
    await page.evaluate(async (): Promise<void> => {
      await document.fonts.ready;
    });
    await expect(page.locator('.widget')).toHaveCount(4);
    await expect
      .poll(async (): Promise<number> => {
        const heights: readonly number[] = await page
          .locator('.widget')
          .evaluateAll((cards: HTMLElement[]): number[] =>
            cards.map(
              (card: HTMLElement): number =>
                card.getBoundingClientRect().height,
            ),
          );
        return Math.max(...heights) - Math.min(...heights);
      })
      .toBeLessThan(1);
    expect(
      await page.evaluate(
        (): boolean => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const measurements: readonly number[] = await page
      .locator('.widget')
      .evaluateAll((cards: HTMLElement[]): number[] =>
        cards.map(
          (card: HTMLElement): number => card.getBoundingClientRect().height,
        ),
      );
    await testInfo.attach('card-heights', {
      body: JSON.stringify({ width, heights: measurements }),
      contentType: 'application/json',
    });
    const contentHeight: number = await page
      .locator('.lab-inner')
      .evaluate((panel: HTMLElement): number => panel.scrollHeight);
    await page.setViewportSize({
      width,
      height: Math.ceil(contentHeight / 0.8),
    });
    await page.screenshot({
      path: testInfo.outputPath(`widgets-${String(width)}.png`),
      fullPage: true,
    });
    await testInfo.attach(`widgets-${String(width)}`, {
      path: testInfo.outputPath(`widgets-${String(width)}.png`),
      contentType: 'image/png',
    });
  });
}
