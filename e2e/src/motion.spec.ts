import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

test.use({ video: 'on' });

test('animates controls and keeps the lab mounted through an interrupted entrance', async ({
  page,
}: {
  readonly page: Page;
}): Promise<void> => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const theme: Locator = page.getByRole('button', { name: 'Color theme' });
  await theme.focus();
  await page.keyboard.down('Space');
  await expect(theme).not.toHaveCSS('transform', 'none');
  await page.keyboard.up('Space');
  await expect(theme).toHaveText('Light');
  const opener: Locator = page.getByRole('button', { name: 'Open lab' });
  const dialog: Locator = page.getByRole('dialog', { name: 'The lab' });
  await opener.click();
  await expect
    .poll(async (): Promise<boolean> =>
      dialog.evaluate((element: HTMLDialogElement): boolean =>
        element
          .getAnimations()
          .some(
            (animation: Animation): boolean =>
              animation.playState === 'running',
          ),
      ),
    )
    .toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('#lab')).toHaveAttribute('data-phase', 'closing');
  await expect(page.locator('.widget')).toHaveCount(4);
  await expect(page.locator('#lab')).not.toBeVisible();
  await expect(page.locator('.widget')).toHaveCount(0);
  await expect(opener).toBeFocused();
  await opener.click();
  await expect(dialog).toBeVisible();
  await expect(page.locator('.widget')).toHaveCount(4);
  await page.getByRole('button', { name: 'Close lab' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
});

for (const mode of ['system', 'manual']) {
  test(`skips decorative motion when paused by ${mode}`, async ({
    page,
  }: {
    readonly page: Page;
  }): Promise<void> => {
    await page.emulateMedia({
      reducedMotion: mode === 'system' ? 'reduce' : 'no-preference',
    });
    await page.goto('/');
    if (mode === 'manual') {
      await page.getByRole('button', { name: 'Pause motion' }).click();
    }
    await expect(
      page.getByRole('button', { name: 'Resume motion' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Open lab' }).click();
    const dialog: Locator = page.getByRole('dialog', { name: 'The lab' });
    await expect(dialog).toBeVisible();
    expect(
      await dialog.evaluate(
        (element: HTMLDialogElement): number =>
          element
            .getAnimations({ subtree: true })
            .filter(
              (animation: Animation): boolean =>
                animation.playState === 'running',
            ).length,
      ),
    ).toBe(0);
    await page.keyboard.press('Escape');
    await expect(page.locator('.widget')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Open lab' })).toBeFocused();
  });
}
