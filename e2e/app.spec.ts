import { test, expect, type Page } from '@playwright/test';

/**
 * Every external host is stubbed: upstream 429/504s and slow tiles are
 * routine and must not decide whether the suite passes.
 */
async function stubNetwork(page: Page) {
  let route: [number, number][] = [];

  // An empty style lets the map load; tiles, glyphs and sprites are never needed.
  await page.route('https://tiles.openfreemap.org/**', (r) =>
    r.request().url().includes('/styles/')
      ? r.fulfill({ json: { version: 8, sources: {}, layers: [] } })
      : r.abort());

  // BRouter: a straight line through the requested points, climbing gently.
  await page.route('https://brouter.de/**', (r) => {
    const lonlats = new URL(r.request().url()).searchParams.get('lonlats') ?? '';
    const pts = lonlats.split('|').map((p) => p.split(',').map(Number) as [number, number]);
    route = [];
    for (let i = 0; i < pts.length - 1; i++) {
      for (let k = 0; k < 20; k++) {
        const t = k / 20;
        route.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]);
      }
    }
    route.push(pts[pts.length - 1]);
    return r.fulfill({
      json: {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: route.map(([lng, lat], i) => [lng, lat, 100 + i * 5]) },
        }],
      },
    });
  });

  // Overpass: a shop and a tap at the middle of whatever BRouter last returned.
  await page.route(/https:\/\/overpass(-api\.de|\.kumi\.systems)\//, (r) => {
    const [lon, lat] = route[Math.floor(route.length / 2)] ?? [19, 52];
    return r.fulfill({
      json: {
        elements: [
          { type: 'node', id: 1, lat, lon, tags: { shop: 'convenience', name: 'Sklep Testowy' } },
          { type: 'node', id: 2, lat, lon, tags: { amenity: 'drinking_water' } },
        ],
      },
    });
  });

  await page.route('https://api-pl-points.easypack24.net/**', (r) => r.fulfill({ json: { items: [] } }));

  await page.route('https://api.open-meteo.com/**', (r) => {
    const n = 16;
    const fill = (v: number) => Array.from({ length: n }, () => v);
    // One day early, so the trip's first day is covered in any timezone.
    const time = Array.from({ length: n }, (_, i) => new Date(Date.now() + (i - 1) * 86_400_000).toISOString().slice(0, 10));
    return r.fulfill({
      json: {
        daily: {
          time,
          temperature_2m_max: fill(21),
          temperature_2m_min: fill(11),
          precipitation_sum: fill(0),
          precipitation_probability_max: fill(10),
          wind_speed_10m_max: fill(12),
          wind_direction_10m_dominant: fill(270),
          weather_code: fill(1),
        },
      },
    });
  });
}

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
    await stubNetwork(page);
    await page.goto('/');
    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible({ timeout: 10000 });
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

  test('a route produces the day, supply, plan and weather sections', async ({ page }) => {
    await addTwoWaypoints(page);
    for (const title of ['Days', 'Supply', 'Resupply plan', 'Weather']) {
      await expect(page.locator('.section-title', { hasText: new RegExp(`^${title}$`) })).toBeVisible({ timeout: 10000 });
    }
    // The stubbed shop and tap made it through classification into the panel.
    await expect(page.getByText(/1 food stops, 1 water sources/)).toBeVisible({ timeout: 10000 });
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
