import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Correct-horse-9";
export const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export const emailFor = (tag: string) => `${tag}-${unique()}@example.com`;

export async function signUp(page: Page, role: "client" | "freelancer", name: string, email: string) {
  await page.goto("/signup");
  await page.locator(`input[name="role"][value="${role}"]`).check({ force: true });
  await page.locator('input[autocomplete="name"]').fill(name);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[autocomplete="new-password"]').nth(0).fill(PASSWORD);
  await page.locator('input[autocomplete="new-password"]').nth(1).fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding/);
}

export async function logIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** The real flow: ask for a link on Account Settings, open it, press Confirm. (Development shows the link on screen.) */
export async function confirmEmail(page: Page) {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Send a new link" }).first().click();
  const link = page.locator('a[href*="/verify-email?token="]').first();
  await expect(link).toBeVisible();
  const href = (await link.getAttribute("href"))!;
  await page.goto(href);
  await page.getByRole("button", { name: "Confirm my email" }).click();
  await expect(page.getByText(/is confirmed/)).toBeVisible();
}

/** A complete freelancer profile, saved through the same endpoint the profile form uses. */
export async function fillFreelancerProfile(page: Page, name: string) {
  const r = await page.request.put("/api/profile", {
    data: {
      name, headline: "Full-stack developer", currentStatus: "working_professional", country: "Canada",
      bio: "I build web apps with React and Next.js.",
      skills: [{ name: "React", level: "expert" }, { name: "Next.js", level: "expert" }, { name: "TypeScript", level: "intermediate" }],
      yearsExperience: 6, hourlyRate: 60, pricingModel: "hourly", minProjectPrice: 300,
      availabilityHoursPerWeek: 25, availabilityStatus: "available", preferredStartDate: "",
      timezone: "America/Toronto", tzOffset: -5, languages: ["English"], linkedinUrl: "", portfolioUrl: "",
      education: "", certifications: "", projects: [], sidequests: [],
    },
  });
  expect(r.ok(), await r.text()).toBeTruthy();
}

export const BRIEF = "I need a marketing website for my bakery built with React and Next.js. It needs a landing page, a menu page and an online ordering form. Budget around $1500, and I would like it done within three weeks.";

export async function openAccountMenu(page: Page) {
  await page.locator('header button[aria-haspopup="menu"]').click();
}

/** Form and page errors. Excludes Next.js's invisible route announcer, which also has role="alert". */
export const alertIn = (page: Page) => page.locator('[role="alert"]:not(#__next-route-announcer__)');
