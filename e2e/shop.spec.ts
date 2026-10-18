import { expect, test } from "@playwright/test";
import { setVisitor, userIdFor } from "./helpers";

test.describe("demo store", () => {
  test("a new visitor gets an anonymous ID and keeps the same variant", async ({
    page,
    context,
  }) => {
    await page.goto("/product/p-headphones");
    const cookie = (await context.cookies()).find((c) => c.name === "abl_uid");
    expect(cookie?.value).toMatch(/^[0-9a-f-]{36}$/);
    expect(cookie?.httpOnly).toBe(true);

    const variant = await page.getByTestId("add-to-cart").getAttribute("data-variant");
    for (let i = 0; i < 3; i++) {
      await page.reload();
      await expect(page.getByTestId("add-to-cart")).toHaveAttribute("data-variant", variant!);
    }
  });

  test("control journey: product -> cart -> simulated purchase", async ({
    page,
    context,
    baseURL,
  }) => {
    await setVisitor(context, userIdFor("control"), baseURL!);

    await page.goto("/");
    await page.getByTestId("product-card").filter({ hasText: "Studio Headphones" }).click();
    await expect(page.getByRole("heading", { name: "Nordwave Studio Headphones" })).toBeVisible();

    const button = page.getByTestId("add-to-cart");
    await expect(button).toHaveAttribute("data-variant", "control");
    await button.click();
    await expect(page.getByTestId("added-message")).toBeVisible();
    await expect(page.getByTestId("upsell-popin")).toHaveCount(0);
    await expect(page.getByTestId("cart-link")).toHaveText("Cart (1)");

    await page.getByTestId("cart-link").click();
    await expect(page.getByTestId("cart-line")).toHaveCount(1);
    await expect(page.getByTestId("cart-total")).toHaveText("$129.00");

    await page.getByTestId("go-to-checkout").click();
    await page.getByTestId("place-order").click();
    await expect(page.getByTestId("order-confirmed")).toContainText("$129.00");
    await expect(page.getByTestId("cart-link")).toHaveText("Cart (0)");
  });

  test("variant B journey: full-width button and upsell pop-in", async ({
    page,
    context,
    baseURL,
  }) => {
    await setVisitor(context, userIdFor("B"), baseURL!);

    await page.goto("/product/p-headphones");
    const button = page.getByTestId("add-to-cart");
    await expect(button).toHaveAttribute("data-variant", "B");
    await expect(button).toContainText("free delivery");
    await button.click();

    const popin = page.getByTestId("upsell-popin");
    await expect(popin).toBeVisible();
    await expect(popin).toContainText("Volta Travel Case");
    await page.getByTestId("upsell-add").click();
    await expect(popin).toBeHidden();

    await page.goto("/cart");
    await expect(page.getByTestId("cart-line")).toHaveCount(2);
    await expect(page.getByTestId("cart-total")).toHaveText("$148.90");
  });
});
