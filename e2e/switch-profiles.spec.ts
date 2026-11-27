import { expect, test } from "@playwright/test";
import { emailFor, fillFreelancerProfile, openAccountMenu, signUp } from "./helpers";

test("one person, two profiles: add the second and switch between them", async ({ page }) => {
  await signUp(page, "client", "Dual Person", emailFor("dual"));
  const switcher = page.getByRole("group", { name: "Switch profile" });
  await expect(switcher).toHaveCount(0); // only one profile so far

  await openAccountMenu(page);
  await page.getByRole("menuitem", { name: "Add a freelancer profile" }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  await expect(switcher).toBeVisible();
  await expect(switcher.getByRole("button", { name: "Freelancer" })).toHaveAttribute("aria-pressed", "true");

  await fillFreelancerProfile(page, "Dual Person");

  // Freelancer view: no "New brief" button, and the brief page is not available
  await expect(page.locator("header").getByRole("link", { name: "New brief" })).toHaveCount(0);
  await page.goto("/brief/new");
  await expect(page).toHaveURL(/\/matches/);

  // Switch to the client profile: it appears again
  await switcher.getByRole("button", { name: "Client" }).click();
  await expect(switcher.getByRole("button", { name: "Client" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("header").getByRole("link", { name: "New brief" })).toBeVisible();
  await page.goto("/brief/new");
  await expect(page).toHaveURL(/\/brief\/new/);

  // The choice survives a reload
  await page.reload();
  await expect(page.getByRole("group", { name: "Switch profile" }).getByRole("button", { name: "Client" })).toHaveAttribute("aria-pressed", "true");
});
