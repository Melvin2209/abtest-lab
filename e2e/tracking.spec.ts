import { expect, test } from "@playwright/test";
import { setVisitor, userIdFor } from "./helpers";

type Results = {
  variants: { key: string; visitors: number; conversions: Record<string, number> }[];
};

async function variantResults(request: import("@playwright/test").APIRequestContext, key: string) {
  const response = await request.get(`/api/experiments/${key}`);
  expect(response.ok()).toBe(true);
  return ((await response.json()) as Results).variants;
}

test("tracked events reach the dashboard", async ({ page, context, baseURL, request }) => {
  const before = await variantResults(request, "upsell-popin");
  const bBefore = before.find((v) => v.key === "B")!;

  // A visitor in B adds to cart, accepts the upsell and buys.
  await setVisitor(context, userIdFor("B", `tracking-${Date.now()}`), baseURL!);
  await page.goto("/product/p-console");
  await page.getByTestId("add-to-cart").click();
  await page.getByTestId("upsell-add").click();
  await page.goto("/checkout");
  await page.getByTestId("place-order").click();
  await expect(page.getByTestId("order-confirmed")).toBeVisible();

  // Events are sent in batches: poll the API until they are processed.
  await expect
    .poll(async () => {
      const b = (await variantResults(request, "upsell-popin")).find((v) => v.key === "B")!;
      return [
        b.visitors - bBefore.visitors,
        b.conversions.purchase - bBefore.conversions.purchase,
        b.conversions.accessory_add - bBefore.conversions.accessory_add,
      ];
    })
    .toEqual([1, 1, 1]);

  // And the dashboard renders the experiment with a verdict.
  await page.goto("/dashboard/upsell-popin");
  await expect(
    page.getByRole("heading", { name: "Upsell pop-in after add to cart" }),
  ).toBeVisible();
  await expect(page.getByTestId("verdict")).toHaveAttribute("data-status", "not_enough_data");
  await expect(page.getByTestId("results-table")).toBeVisible();
});

test("the events API rejects invalid payloads", async ({ request, baseURL }) => {
  const missingCookie = await request.post("/api/events", {
    data: { events: [{ type: "purchase", valueCents: 100 }] },
  });
  expect(missingCookie.status()).toBe(400);

  const invalid = await request.post("/api/events", {
    data: { events: [{ type: "purchase", valueCents: -1 }] },
    headers: { cookie: "abl_uid=api-test" },
  });
  expect(invalid.status()).toBe(400);
  expect(baseURL).toBeTruthy();
});

test("the dashboard lists both experiments", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByTestId("experiment-card")).toHaveCount(2);
});
