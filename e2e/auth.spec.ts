import { expect, test } from "@playwright/test";
import { PASSWORD, alertIn, emailFor, logIn, openAccountMenu, signUp } from "./helpers";

test.describe("accounts", () => {
  test("private pages send a signed-out visitor to sign in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test("sign up, sign out, reject a wrong password, then sign in", async ({ page }) => {
    const email = emailFor("auth");
    await signUp(page, "freelancer", "Ada Lovelace", email);

    await openAccountMenu(page);
    await page.getByRole("menuitem", { name: "Sign Out" }).click();
    await expect(page).toHaveURL(/\/($|login)/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/); // the session really ended

    await logIn(page, email, "Wrong-pass-1");
    await expect(alertIn(page)).toContainText(/incorrect|invalid|wrong|not match/i);
    await expect(page).toHaveURL(/\/login/);

    await logIn(page, email);
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/);
  });

  test("a duplicate email is refused", async ({ page, browser }) => {
    const email = emailFor("dupe");
    await signUp(page, "client", "First Person", email);
    const other = await (await browser.newContext()).newPage();
    await other.goto("/signup");
    await other.locator('input[name="role"][value="client"]').check({ force: true });
    await other.locator('input[autocomplete="name"]').fill("Second Person");
    await other.locator('input[type="email"]').fill(email);
    await other.locator('input[autocomplete="new-password"]').nth(0).fill(PASSWORD);
    await other.locator('input[autocomplete="new-password"]').nth(1).fill(PASSWORD);
    await other.getByRole("checkbox").check();
    await other.getByRole("button", { name: "Create account" }).click();
    await expect(other.getByText(/already exists/i)).toBeVisible();
    await other.context().close();
  });

  test("password reset: link, new password, old password stops working", async ({ page }) => {
    const email = emailFor("reset");
    await signUp(page, "client", "Reset Person", email);
    await openAccountMenu(page);
    await page.getByRole("menuitem", { name: "Sign Out" }).click();

    await page.goto("/forgot-password");
    await page.locator('input[type="email"]').fill(email);
    await page.getByRole("button", { name: /send|reset|link/i }).click();
    const link = page.locator('a[href*="/reset-password?token="]').first(); // development shows the link on screen
    await expect(link).toBeVisible();
    await page.goto((await link.getAttribute("href"))!);
    const next = "Brand-new-pass-7";
    await page.locator('input[autocomplete="new-password"]').nth(0).fill(next);
    await page.locator('input[autocomplete="new-password"]').nth(1).fill(next);
    await page.getByRole("button", { name: /reset|save|change|set/i }).click();
    await expect(page).toHaveURL(/\/login/);

    await logIn(page, email); // old password
    await expect(alertIn(page)).toBeVisible();
    await logIn(page, email, next);
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/);
  });
});
