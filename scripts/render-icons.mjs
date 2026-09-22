// Rasterize public/icon-192.svg into the PNG icons the PWA manifest lists.
// Uses Playwright's Chromium (already a dev dependency) — no native SVG tools needed.
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

const svg = readFileSync(new URL('../public/icon-192.svg', import.meta.url), 'utf8');
const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

const targets = [
  { file: 'icon-192.png', size: 192, scale: 1 },
  { file: 'icon-512.png', size: 512, scale: 1 },
  // Maskable: artwork inside the 80% safe zone, background fills the bleed.
  { file: 'icon-maskable-512.png', size: 512, scale: 0.8 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const t of targets) {
  await page.setViewportSize({ width: t.size, height: t.size });
  const inner = Math.round(t.size * t.scale);
  const pad = Math.round((t.size - inner) / 2);
  await page.setContent(`<html><body style="margin:0;background:${t.scale < 1 ? '#0f172a' : 'transparent'}">
    <img src="${dataUri}" style="position:absolute;left:${pad}px;top:${pad}px;width:${inner}px;height:${inner}px"></body></html>`);
  const png = await page.screenshot({ omitBackground: t.scale === 1, clip: { x: 0, y: 0, width: t.size, height: t.size } });
  writeFileSync(new URL(`../public/${t.file}`, import.meta.url), png);
  console.log(`wrote public/${t.file}`);
}
await browser.close();
