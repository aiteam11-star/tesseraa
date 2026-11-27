import { describe, expect, it } from "vitest";
import { blockedUntilVerified, isVerified, verificationRequired } from "@/lib/verification";

const provider = { RESEND_API_KEY: "re_x", EMAIL_FROM: "Tessera <hi@example.com>" };

describe("when email verification is enforced", () => {
  it("is off when no email can be sent, so a new site never locks people out", () => {
    expect(verificationRequired({})).toBe(false);
    expect(verificationRequired({ RESEND_API_KEY: "re_x" })).toBe(false); // needs the sender address too
  });
  it("turns on automatically once an email provider is configured", () => {
    expect(verificationRequired(provider)).toBe(true);
  });
  it("can be forced on for testing, or forced off", () => {
    expect(verificationRequired({ REQUIRE_EMAIL_VERIFICATION: "true" })).toBe(true);
    expect(verificationRequired({ ...provider, REQUIRE_EMAIL_VERIFICATION: "false" })).toBe(false);
  });
});

describe("who is blocked", () => {
  const unverified = { emailVerifiedAt: null };
  const verified = { emailVerifiedAt: new Date() };
  it("reads the verified flag", () => {
    expect(isVerified(unverified)).toBe(false);
    expect(isVerified(verified)).toBe(true);
  });
  it("blocks only unverified people, and only when enforcement is on", () => {
    expect(blockedUntilVerified(unverified, provider)).toBe(true);
    expect(blockedUntilVerified(verified, provider)).toBe(false);
    expect(blockedUntilVerified(unverified, {})).toBe(false);
  });
});
