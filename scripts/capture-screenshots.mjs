// Captures the README screenshots and demo GIF from a running production build.
//
//   npm run simulate && npm run build && npx next start -p 3200
//   node scripts/capture-screenshots.mjs http://localhost:3200
//
// The GIF needs ffmpeg on the PATH.
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3200";
const out = "docs/screenshots";
const videoDir = "test-results/video";
mkdirSync(out, { recursive: true });

// Visitor IDs that land in variant B of both experiments (see e2e/helpers.ts).
const VARIANT_B_USER = "demo-12";

const browser = await chromium.launch();

async function newPage(userId, options = {}) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    ...options,
  });
  if (userId) await context.addCookies([{ name: "abl_uid", value: userId, url: base }]);
  return { context, page: await context.newPage() };
}

// 1. Static screenshots.
{
  const { context, page } = await newPage(VARIANT_B_USER);
  await page.goto(`${base}/`);
  await page.screenshot({ path: `${out}/store.png` });

  await page.goto(`${base}/product/p-headphones`);
  await page.getByTestId("add-to-cart").click();
  await page.getByTestId("upsell-popin").waitFor();
  await page.screenshot({ path: `${out}/upsell-popin.png` });

  await page.goto(`${base}/dashboard`);
  await page.screenshot({ path: `${out}/dashboard.png` });

  await page.goto(`${base}/dashboard/atc-button`);
  await page.screenshot({ path: `${out}/experiment.png`, fullPage: true });
  await context.close();
}

// 2. Demo video -> GIF: a visitor in variant B, then the dashboard.
{
  rmSync(videoDir, { recursive: true, force: true });
  const { context, page } = await newPage(VARIANT_B_USER, {
    deviceScaleFactor: 1,
    recordVideo: { dir: videoDir, size: { width: 1280, height: 800 } },
  });
  const pause = (ms) => page.waitForTimeout(ms);
  await page.goto(`${base}/`);
  await pause(1200);
  await page.getByTestId("product-card").filter({ hasText: "Studio Headphones" }).click();
  await page.getByTestId("add-to-cart").waitFor();
  await pause(1200);
  await page.getByTestId("add-to-cart").click();
  await pause(1800);
  await page.getByTestId("upsell-add").click();
  await pause(800);
  await page.goto(`${base}/dashboard`);
  await pause(1500);
  await page.getByTestId("experiment-card").first().click();
  await page.getByTestId("verdict-panel").waitFor();
  await pause(1500);
  // Hover the forest plot, then sweep the crosshair across the cumulative chart.
  const forest = page.getByRole("img", { name: /confidence intervals/ });
  const forestBox = await forest.boundingBox();
  await page.mouse.move(forestBox.x + forestBox.width * 0.7, forestBox.y + 30, { steps: 10 });
  await pause(1800);
  const chart = page.getByRole("img", { name: /Cumulative conversion rate/ });
  await chart.scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 200);
  await pause(800);
  const box = await chart.boundingBox();
  const left = box.x + box.width * 0.08;
  const right = box.x + box.width * 0.85;
  for (let i = 0; i <= 30; i++) {
    await page.mouse.move(left + ((right - left) * i) / 30, box.y + box.height / 2);
    await pause(110);
  }
  await pause(1500);
  await context.close();

  const [video] = readdirSync(videoDir);
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      `${videoDir}/${video}`,
      "-vf",
      "fps=10,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=5",
      `${out}/demo.gif`,
    ],
    { stdio: "ignore" },
  );
}

await browser.close();
console.log(`Screenshots written to ${out}/`);
