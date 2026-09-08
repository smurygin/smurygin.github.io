import { expect, test } from '@playwright/test';
import type { Locator, Page, Route } from '@playwright/test';

async function pixels(canvas: Locator): Promise<string> {
  return canvas.evaluate((element: HTMLCanvasElement): string =>
    element.toDataURL(),
  );
}

test('rotates the record for listening history and respects motion controls', async ({
  page,
}: {
  readonly page: Page;
}): Promise<void> => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route(
    '**/data/spotify.json*',
    async (route: Route): Promise<void> => {
      await route.fulfill({
        json: {
          updatedAt: new Date().toISOString(),
          data: {
            state: 'active',
            title: 'Last played track',
            detail: 'Artist',
            album: 'Album',
            playedAt: '2026-09-08T10:00:00.000Z',
          },
        },
      });
    },
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Open lab' }).click();
  const spotify: Locator = page.getByRole('article', {
    name: 'spotify',
    exact: true,
  });
  const canvas: Locator = spotify.locator('canvas');
  await expect(canvas).toHaveAttribute('data-playback', 'playing');
  await expect(spotify.getByText(/^Played:/)).toBeVisible();
  await page.clock.runFor(500);
  const spinning: string = await pixels(canvas);
  await page.clock.runFor(500);
  expect(await pixels(canvas)).not.toBe(spinning);

  await page.getByRole('button', { name: 'Close lab' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('button', { name: 'Pause motion' }).click();
  await page.getByRole('button', { name: 'Open lab' }).click();
  await expect(canvas).toHaveAttribute('data-playback', 'playing');
  await page.clock.runFor(500);
  const paused: string = await pixels(canvas);
  await page.clock.runFor(500);
  expect(await pixels(canvas)).toBe(paused);

  await page.getByRole('button', { name: 'Close lab' }).click();
  await page.getByRole('button', { name: 'Resume motion' }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Open lab' }).click();
  await expect(canvas).toHaveAttribute('data-playback', 'playing');
  await page.clock.runFor(500);
  const reduced: string = await pixels(canvas);
  await page.clock.runFor(500);
  expect(await pixels(canvas)).toBe(reduced);
});
