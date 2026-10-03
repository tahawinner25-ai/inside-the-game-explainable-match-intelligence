import { expect, test } from "@playwright/test";

test("starting the synthetic simulation reveals a traceable insight", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Priority insights" })).toBeVisible();
  await page.getByRole("button", { name: /Start/ }).click();
  await expect(page.getByText("Tactical pattern", { exact: true }).first()).toBeVisible({ timeout: 12_000 });
  await expect(page.getByText(/supporting events/).first()).toBeVisible();
  await page.getByLabel("Event type").selectOption("goal");
  await expect(page.getByRole("button", { name: /score in the first half/i })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download synthetic match report as CSV" }).click();
  const downloadedFile = await download;
  expect(downloadedFile.suggestedFilename()).toBe("match_demo_01-synthetic-report.csv");
});
