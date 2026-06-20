import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { constructWebhookEvent, verifyWebhookSignature } from "../src/webhook.js";

function signBody(rawBody: string, secret: string, t = Math.floor(Date.now() / 1000)): string {
  const v1 = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

describe("verifyWebhookSignature", () => {
  it("accepts a valid signature on the raw body", () => {
    const secret = "whsec_test_secret";
    const rawBody = '{"id":"evt_1","type":"checkout.session.completed"}';
    const header = signBody(rawBody, secret);

    expect(verifyWebhookSignature(rawBody, header, secret)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const secret = "whsec_test_secret";
    const rawBody = '{"id":"evt_1"}';
    const header = signBody(rawBody, secret);

    expect(verifyWebhookSignature(`${rawBody} `, header, secret)).toBe(false);
  });

  it("rejects expired signatures when tolerance is set", () => {
    const secret = "whsec_test_secret";
    const rawBody = '{"id":"evt_1"}';
    const oldT = Math.floor(Date.now() / 1000) - 600;
    const header = signBody(rawBody, secret, oldT);

    expect(verifyWebhookSignature(rawBody, header, secret, { toleranceSeconds: 300 })).toBe(false);
    expect(verifyWebhookSignature(rawBody, header, secret, { toleranceSeconds: 0 })).toBe(true);
  });
});

describe("constructWebhookEvent", () => {
  it("returns the parsed envelope when the signature is valid", () => {
    const secret = "whsec_test_secret";
    const rawBody = '{"id":"evt_1","type":"checkout.session.completed","data":{"object":{}}}';
    const header = signBody(rawBody, secret);

    const event = constructWebhookEvent(rawBody, header, secret);

    expect(event.type).toBe("checkout.session.completed");
    expect(event.id).toBe("evt_1");
  });

  it("throws when the signature is invalid", () => {
    expect(() =>
      constructWebhookEvent('{"type":"x"}', "t=1,v1=deadbeef", "whsec_test_secret")
    ).toThrow("Invalid Keeal webhook signature");
  });
});
