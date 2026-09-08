import { expect, test } from '@playwright/test';
import type { Locator, Page, Route, TestInfo } from '@playwright/test';

async function expectTheme(page: Page, dark: boolean): Promise<void> {
  await expect(page.locator('html')).toHaveCSS(
    'background-color',
    dark ? 'rgb(36, 58, 31)' : 'rgb(183, 199, 125)',
  );
  await expect(page.locator('html')).toHaveCSS(
    'color',
    dark ? 'rgb(183, 199, 125)' : 'rgb(36, 58, 31)',
  );
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    'content',
    dark ? '#243a1f' : '#b7c77d',
  );
}

test('cycles Auto, Light and Dark with keyboard support and persistence', async ({
  page,
}: {
  readonly page: Page;
}): Promise<void> => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  const button: Locator = page.getByRole('button', { name: 'Color theme' });
  await expect(button).toHaveText('Auto');
  await expectTheme(page, true);
  await page.emulateMedia({ colorScheme: 'light' });
  await expectTheme(page, false);
  await button.click();
  await expect(button).toHaveText('Light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expectTheme(page, false);
  await button.press('Enter');
  await expect(button).toHaveText('Dark');
  await expectTheme(page, true);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.reload();
  await expect(button).toHaveText('Dark');
  await expectTheme(page, true);
  await button.press('Space');
  await expect(button).toHaveText('Auto');
  await expectTheme(page, false);
  expect(
    await page.evaluate((): string | null => localStorage.getItem('theme')),
  ).toBeNull();
});

test('applies saved choice before the application loads', async ({
  page,
}: {
  readonly page: Page;
}): Promise<void> => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript((): void => {
    localStorage.setItem('theme', 'dark');
  });
  await page.route('**/main-*.js', async (route: Route): Promise<void> => {
    await route.abort();
  });
  await page.goto('/');
  await expectTheme(page, true);
});

test('can switch themes when local storage is blocked', async ({
  page,
}: {
  readonly page: Page;
}): Promise<void> => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript((): void => {
    Object.defineProperty(window, 'localStorage', {
      get: (): never => {
        throw new Error('Storage blocked');
      },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Color theme' }).click();
  await page.getByRole('button', { name: 'Color theme' }).click();
  await expectTheme(page, true);
});

for (const width of [1280, 390]) {
  test(`recolors paused canvas artwork at ${String(width)}px`, async ({
    page,
  }: { readonly page: Page }, testInfo: TestInfo): Promise<void> => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await page.route(
      '**/site-config.json',
      async (route: Route): Promise<void> => {
        await route.fulfill({ json: { location: '' } });
      },
    );
    await page.route(
      '**/data/steam.json*',
      async (route: Route): Promise<void> => {
        await route.fulfill({
          json: {
            updatedAt: new Date().toISOString(),
            data: {
              state: 'active',
              title: 'Example game',
              value: 24.8,
              appId: 1,
            },
          },
        });
      },
    );
    await page.route(
      '**/data/spotify.json*',
      async (route: Route): Promise<void> => {
        await route.fulfill({
          json: {
            updatedAt: new Date().toISOString(),
            data: { state: 'idle' },
          },
        });
      },
    );
    await page.goto('/');
    await page.getByRole('button', { name: 'Open lab' }).click();
    await expect(page.locator('.widget canvas')).toHaveCount(2);
    for (const dark of [false, true]) {
      await page.emulateMedia({ colorScheme: dark ? 'dark' : 'light' });
      await expectTheme(page, dark);
      await expect
        .poll(async (): Promise<string[]> =>
          page
            .locator('.widget canvas, app-background-canvas canvas')
            .evaluateAll((canvases: HTMLCanvasElement[]): string[] =>
              canvases.map((canvas: HTMLCanvasElement): string =>
                Array.from(
                  canvas.getContext('2d')?.getImageData(0, 0, 1, 1).data ?? [],
                ).join(','),
              ),
            ),
        )
        .toEqual(Array(3).fill(dark ? '36,58,31,255' : '183,199,125,255'));
      expect(
        await page.evaluate(
          (): boolean => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const theme: string = dark ? 'dark' : 'light';
      await page.screenshot({
        path: testInfo.outputPath(`${theme}-${String(width)}.png`),
        fullPage: true,
      });
      await testInfo.attach(`${theme}-${String(width)}`, {
        path: testInfo.outputPath(`${theme}-${String(width)}.png`),
        contentType: 'image/png',
      });
    }
  });
}
