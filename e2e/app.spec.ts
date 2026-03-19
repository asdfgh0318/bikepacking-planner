import { test, expect } from '@playwright/test';

test.describe('Bikepacking Planner', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Mark wizard as complete so it doesn't block tests
    await page.evaluate(() => localStorage.setItem('bikepacking-wizard-complete', 'true'));
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('app loads with map and sidebar', async ({ page }) => {
    // Map canvas should be present
    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible({ timeout: 10000 });

    // Sidebar should show route panel with empty state
    await expect(page.locator('.panel').first()).toBeVisible();
    await expect(page.getByText('Click on the map to add waypoints')).toBeVisible();
  });

  test('sidebar tabs are clickable', async ({ page }) => {
    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible({ timeout: 10000 });

    // Tabs use .tab-nav button.tab
    const tabs = page.locator('.tab-nav button.tab');
    const tabCount = await tabs.count();
    expect(tabCount).toBe(7); // route, supply, diet, gear, shop, weather, settings

    for (let i = 0; i < tabCount; i++) {
      await tabs.nth(i).click();
      await expect(tabs.nth(i)).toHaveClass(/active/);
    }
  });

  test('can add waypoints by clicking the map', async ({ page }) => {
    const canvas = page.locator('canvas.maplibregl-canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Click on the map to add waypoints
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.4);
    await page.waitForTimeout(500);
    await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6);
    await page.waitForTimeout(500);

    // Should see waypoints listed
    await expect(page.locator('.waypoint-list')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.waypoint-item')).toHaveCount(2, { timeout: 5000 });
  });

  test('routing profile selector works', async ({ page }) => {
    const canvas = page.locator('canvas.maplibregl-canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.4);
    await page.waitForTimeout(500);
    await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6);
    await page.waitForTimeout(500);

    // Profile selector should appear
    const profiles = page.locator('.profile-btn');
    await expect(profiles).toHaveCount(3, { timeout: 5000 });

    // Click MTB profile
    await profiles.nth(2).click();
    await expect(profiles.nth(2)).toHaveClass(/active/);
  });

  test('settings panel has toggles and sliders', async ({ page }) => {
    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible({ timeout: 10000 });

    // Navigate to settings tab
    await page.locator('.tab-nav button.tab', { hasText: 'Settings' }).click();

    // Should have toggles for map layers
    await expect(page.locator('.setting-card').first()).toBeVisible();

    // Should have corridor width slider
    await expect(page.getByText('Corridor width')).toBeVisible();

    // Should have season selector
    await expect(page.locator('.season-grid')).toBeVisible();
  });

  test('supply panel shows empty state without route', async ({ page }) => {
    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible({ timeout: 10000 });

    // Click supply tab
    await page.locator('.tab-nav button.tab', { hasText: 'Supply' }).click();

    // Should show empty state
    await expect(page.getByText('No supply points yet')).toBeVisible({ timeout: 3000 });
  });

  test('weather panel shows empty state without route', async ({ page }) => {
    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible({ timeout: 10000 });

    // Click weather tab
    await page.locator('.tab-nav button.tab', { hasText: 'Weather' }).click();

    // Should show empty state
    await expect(page.getByText(/No route planned yet/i)).toBeVisible({ timeout: 3000 });
  });

  test('theme toggle switches between light and dark', async ({ page }) => {
    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible({ timeout: 10000 });

    // Go to settings tab
    await page.locator('.tab-nav button.tab', { hasText: 'Settings' }).click();

    // Find theme toggle
    await expect(page.getByText('Light Mode')).toBeVisible();

    // Get initial theme
    const initialTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));

    // Click the toggle element next to "Light Mode"
    await page.locator('.toggle').first().click();
    await page.waitForTimeout(300);

    // Theme attribute should change
    const newTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(newTheme).not.toEqual(initialTheme);
  });

  test('full screenshot of app in default state', async ({ page }) => {
    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000); // Let tiles load
  });
});
