import { expect, test } from "@playwright/test";

test("starting the synthetic simulation reveals a traceable insight", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Priority insights" })).toBeVisible();
  await page.getByRole("button", { name: /Start/ }).click();
  await expect(page.getByText("Tactical pattern", { exact: true }).first()).toBeVisible({ timeout: 12_000 });
  await expect(page.getByText(/supporting events/).first()).toBeVisible();
});
