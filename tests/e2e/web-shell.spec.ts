import { expect, test } from '@playwright/test';

const webUrl = process.env.SPECTRAFORM_WEB_URL ?? 'http://127.0.0.1:4173';

test('renders the offline application shell with semantic regions', async ({ page }) => {
  const remoteRequests: string[] = [];

  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
      remoteRequests.push(request.url());
    }
  });

  await page.goto(webUrl);

  await expect(page.getByTestId('stage')).toBeVisible();
  await expect(page.getByTestId('app-status')).toContainText('Offline shell ready');
  await expect(page.getByTestId('debug-slot')).toBeVisible();
  expect(remoteRequests).toEqual([]);
});

test('renders a safe application error state', async ({ page }) => {
  await page.goto(`${webUrl}/?simulate-error=1`);
  await expect(page.getByTestId('app-error')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('safe error state');
});
