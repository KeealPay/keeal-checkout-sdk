import { describe, expect, it } from "vitest";
import { KeealCheckout } from "../src/client.js";

const e2eEnabled = process.env.KEEAL_E2E === "1";
const apiKey = process.env.KEEAL_API_KEY?.trim();
const baseUrl = process.env.KEEAL_BASE_URL?.trim();

describe.skipIf(!e2eEnabled || !apiKey || !baseUrl)("KeealCheckout E2E", () => {
  const checkout = new KeealCheckout({ apiKey: apiKey!, baseUrl: baseUrl! });

  it("creates a payment checkout session against a live API", async () => {
    const { id, url } = await checkout.createSession({
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "SDK E2E payment" },
            unit_amount: 100,
          },
          quantity: 1,
        },
      ],
      success_url: "https://example.com/success",
      cancel_url: "https://example.com/cancel",
      client_reference_id: `sdk-e2e-payment-${Date.now()}`,
    });

    expect(id).toMatch(/^cs_/);
    expect(url).toContain(id);
  });

  it("creates a subscription checkout session when KEEAL_E2E_PRICE_ID is set", async () => {
    const priceId = process.env.KEEAL_E2E_PRICE_ID?.trim();
    if (!priceId) {
      return;
    }

    const { id, url } = await checkout.createSession({
      mode: "subscription",
      subscription_data: { price_id: priceId },
      success_url: "https://example.com/welcome",
      cancel_url: "https://example.com/pricing",
      client_reference_id: `sdk-e2e-sub-${Date.now()}`,
    });

    expect(id).toMatch(/^cs_/);
    expect(url).toContain(id);
  });
});
