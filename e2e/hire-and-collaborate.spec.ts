import { expect, test, type Page } from "@playwright/test";
import { BRIEF, confirmEmail, emailFor, fillFreelancerProfile, signUp } from "./helpers";

// A 1x1 PNG, used as the "finished work" the freelancer uploads.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

const firstItem = (page: Page) => page.locator("li.card").first();
const statusOf = (page: Page) => firstItem(page).locator(".chip").first();
const openFirstItem = async (page: Page) => {
  const toggle = firstItem(page).locator("button[aria-expanded]").first();
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
};

test("client publishes, freelancer applies, they work together live", async ({ browser }) => {
  const clientCtx = await browser.newContext();
  const freeCtx = await browser.newContext();
  const client = await clientCtx.newPage();
  const free = await freeCtx.newPage();

  // ---- Client: sign up, confirm email, write a brief, publish it
  await signUp(client, "client", "Dana Client", emailFor("dana"));
  await confirmEmail(client);
  await client.goto("/brief/new");
  await client.getByPlaceholder(/Messy is fine/).fill(BRIEF);
  await client.getByRole("button", { name: "Turn this into a brief" }).click();
  await expect(client).toHaveURL(/\/brief\/[a-z0-9]+/, { timeout: 30_000 });
  await client.getByRole("button", { name: "Publish project" }).click();
  await expect(client).toHaveURL(/\/projects\/[a-z0-9]+$/);
  const projectUrl = client.url();
  await expect(client.getByText(/Published/).first()).toBeVisible();

  // ---- Freelancer: sign up, profile, confirm email, apply
  await signUp(free, "freelancer", "Priya Dev", emailFor("priya"));
  await fillFreelancerProfile(free, "Priya Dev");
  await confirmEmail(free);
  await free.goto(projectUrl);
  await free.getByRole("button", { name: "Apply to this project" }).click();
  await free.getByLabel("Cover note").fill("I have built several Next.js marketing sites and would start with the landing page, then the menu and ordering form.");
  await free.getByRole("button", { name: /Send proposal/ }).click();
  await expect(free.getByText(/You sent a proposal/)).toBeVisible();

  // ---- Client: sees the proposal and hires
  await client.reload();
  await expect(client.getByText("Priya Dev").first()).toBeVisible();
  await client.getByRole("button", { name: "Accept and open project room" }).click();
  await expect(client.getByRole("link", { name: "Workspace" })).toBeVisible();

  // ---- Both in the shared workspace
  await free.goto(projectUrl);
  await expect(free.getByRole("heading", { name: "Workspace" })).toBeVisible();
  await expect(client.getByText(/Priya Dev is here now/)).toBeVisible(); // live presence

  // Freelancer starts work -> the client's open page updates without a reload
  await openFirstItem(free);
  await free.getByRole("button", { name: "Start work" }).click();
  await expect(statusOf(free)).toHaveText("In progress");
  await expect(statusOf(client)).toHaveText("In progress");

  // Freelancer submits finished work with a file -> client sees it waiting for review
  await free.getByLabel("What did you do or change?").fill("First draft of the landing page is ready, see the attached image.");
  await free.locator('input[type="file"]').first().setInputFiles({ name: "landing-draft.png", mimeType: "image/png", buffer: PNG });
  await expect(free.getByText("landing-draft.png")).toBeVisible();
  await free.getByRole("button", { name: "Submit for review" }).click();
  await expect(statusOf(client)).toHaveText("Waiting for review");

  // Client opens it, sees the attachment, asks for changes
  await openFirstItem(client);
  await expect(client.getByRole("img", { name: "landing-draft.png" })).toBeVisible();
  const download = await client.request.get(await client.getByRole("img", { name: "landing-draft.png" }).getAttribute("src") as string);
  expect(download.status()).toBe(200);
  expect(Buffer.from(await download.body()).equals(PNG)).toBe(true); // the client can really download the file
  await client.getByLabel("Feedback or comment").fill("Please make the headline larger.");
  await client.getByRole("button", { name: "Request changes" }).click();

  // Freelancer sees the request live, revises, resubmits
  await expect(statusOf(free)).toHaveText("Changes requested");
  await openFirstItem(free);
  await expect(free.getByText("Please make the headline larger.")).toBeVisible();
  await free.getByLabel("What did you do or change?").fill("Headline is now 48px, as asked.");
  await free.getByRole("button", { name: "Submit revised work" }).click();
  await expect(statusOf(client)).toHaveText("Waiting for review");

  // Client approves; freelancer sees it
  await client.getByRole("button", { name: "Approve" }).click();
  await expect(statusOf(client)).toHaveText("Approved");
  await expect(statusOf(free)).toHaveText("Approved");

  // ---- Chat is live too, with typing
  await client.goto(`${projectUrl}?tab=chat`);
  await free.goto(`${projectUrl}?tab=chat`);
  await expect(client.getByText(/Live$/)).toBeVisible();
  await expect(free.getByText(/Live$/)).toBeVisible();
  const box = client.getByPlaceholder("Write a message");
  await box.pressSequentially("Great work on the landing page!", { delay: 30 });
  await expect(free.getByText("Dana Client is typing…")).toBeVisible();
  await client.getByRole("button", { name: "Send" }).click();
  await expect(free.getByText("Great work on the landing page!")).toBeVisible(); // arrived without a reload

  // ---- A stranger cannot see any of it
  const strangerCtx = await browser.newContext();
  const stranger = await strangerCtx.newPage();
  await signUp(stranger, "freelancer", "Nosy Stranger", emailFor("nosy"));
  const id = projectUrl.split("/").pop();
  expect((await stranger.goto(projectUrl))?.status()).toBe(404); // an in-progress project looks like it does not exist
  expect((await stranger.request.get(`/api/projects/${id}/board`)).status()).toBe(404);
  expect((await stranger.request.get(`/api/projects/${id}/messages`)).status()).toBe(404);
  expect((await stranger.request.get(`/api/projects/${id}/stream`)).status()).toBe(404);

  await Promise.all([clientCtx.close(), freeCtx.close(), strangerCtx.close()]);
});
