import { expect, test } from "@playwright/test";
import { alertIn, confirmEmail, emailFor, fillFreelancerProfile, signUp } from "./helpers";

test("freelancer: profile, matches, then apply (blocked until the email is confirmed)", async ({ page }) => {
  const name = "Sam Freelancer";
  await signUp(page, "freelancer", name, emailFor("sam"));
  await fillFreelancerProfile(page, name);

  // The profile page shows what was saved
  await page.goto("/profile");
  await expect(page.getByText("Full-stack developer").first()).toBeVisible();

  // Matches lists open sample projects for this skill set
  await page.goto("/matches");
  const project = page.locator('main a[href^="/projects/"]').first();
  await expect(project).toBeVisible();
  const title = (await project.textContent())!.trim();
  await project.click();
  await expect(page).toHaveURL(/\/projects\/[a-z0-9]+$/);
  const projectUrl = page.url();

  const note = "I have shipped similar projects and would begin with the main deliverable, then iterate on your feedback.";
  const apply = async () => {
    await page.getByRole("button", { name: "Apply to this project" }).click();
    await page.getByLabel("Cover note").fill(note);
    await page.getByRole("button", { name: /Send proposal/ }).click();
  };

  // Not confirmed yet: the server refuses and the page says why
  await apply();
  await expect(alertIn(page)).toContainText(/Confirm your email first/);

  // Confirm through the real link flow, then apply for real
  await confirmEmail(page);
  await page.goto(projectUrl);
  await apply();
  await expect(page.getByText(/You sent a proposal/)).toBeVisible();

  // It shows up in the freelancer's project list
  await page.goto("/projects");
  await expect(page.getByText(title).first()).toBeVisible();
});
