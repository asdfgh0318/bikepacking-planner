import { test, expect, type Page } from '@playwright/test';

async function addTwoWaypoints(page: Page) {
  const canvas = page.locator('canvas.maplibregl-canvas');
  await expect(canvas).toBeVisible({ timeout: 10000 });
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not found');
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.4);
  await page.waitForTimeout(300);
  await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6);
  await expect(page.locator('.waypoint-item')).toHaveCount(2, { timeout: 5000 });
}

test.describe('Bikepacking Planner', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('loads with map and empty route', async ({ page }) => {
    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Tap the map to add waypoints')).toBeVisible();
    // Sections that need a route stay hidden until there is one.
    await expect(page.locator('.section')).toHaveCount(2); // Route + Map & settings
  });

  test('waypoints appear and can be removed', async ({ page }) => {
    await addTwoWaypoints(page);
    await page.locator('.waypoint-item button').first().click();
    await expect(page.locator('.waypoint-item')).toHaveCount(1);
  });

  test('routing profile switches', async ({ page }) => {
    await addTwoWaypoints(page);
    const seg = page.getByRole('radiogroup', { name: 'Routing profile' });
    await seg.getByRole('radio', { name: 'MTB' }).click();
    await expect(seg.getByRole('radio', { name: 'MTB' })).toHaveAttribute('aria-checked', 'true');
  });

  test('route survives a reload', async ({ page }) => {
    await addTwoWaypoints(page);
    await page.reload();
    await expect(page.locator('.waypoint-item')).toHaveCount(2, { timeout: 10000 });
  });

  test('theme toggle flips the document theme', async ({ page }) => {
    await page.locator('.section summary', { hasText: 'Map & settings' }).click();
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await page.getByText('Light theme').click();
    await expect.poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme'))).not.toBe(before);
  });

  test('clear route empties the panel', async ({ page }) => {
    await addTwoWaypoints(page);
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.getByText('Tap the map to add waypoints')).toBeVisible();
  });
});
