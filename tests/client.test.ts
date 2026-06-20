import { describe, expect, it } from "vitest";
import { KeealCheckout } from "../src/client.js";

type RecordedRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
};

function createMockFetch(
  response: { status?: number; body: unknown },
  onRequest?: (req: RecordedRequest) => void
): typeof fetch {
  return async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const headers = new Headers(init?.headers);
    const recorded: RecordedRequest = {
      url,
      method: init?.method ?? "GET",
      headers: Object.fromEntries(headers.entries()),
      body: typeof init?.body === "string" ? init.body : undefined,
    };
    onRequest?.(recorded);

    return new Response(JSON.stringify(response.body), {
      status: response.status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}

describe("KeealCheckout.createSession", () => {
  it("POSTs payment-mode params to /checkout/sessions with auth and idempotency", async () => {
    let recorded: RecordedRequest | undefined;

    const checkout = new KeealCheckout({
      apiKey: "keeal_sk_test",
      baseUrl: "https://api.keeal.test/api/",
      fetchImpl: createMockFetch(
        { body: { id: "cs_pay", url: "https://pay.keeal.test/cs_pay" } },
        (req) => {
          recorded = req;
        }
      ),
    });

    const params = {
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Widget" },
            unit_amount: 1500,
          },
          quantity: 1,
        },
      ],
      success_url: "https://shop.test/thanks",
      cancel_url: "https://shop.test/cart",
      client_reference_id: "order-42",
    };

    const result = await checkout.createSession(params, { idempotencyKey: "idem-123" });

    expect(result).toEqual({ id: "cs_pay", url: "https://pay.keeal.test/cs_pay" });
    expect(recorded?.method).toBe("POST");
    expect(recorded?.url).toBe("https://api.keeal.test/api/checkout/sessions");
    expect(recorded?.headers.authorization).toBe("Bearer keeal_sk_test");
    expect(recorded?.headers["idempotency-key"]).toBe("idem-123");
    expect(JSON.parse(recorded!.body!)).toEqual(params);
  });

  it("POSTs subscription mode with line_items catalog price (Stripe parity)", async () => {
    let recorded: RecordedRequest | undefined;

    const checkout = new KeealCheckout({
      apiKey: "keeal_sk_test",
      baseUrl: "https://api.keeal.test/api",
      fetchImpl: createMockFetch(
        { body: { id: "cs_sub_price", url: "https://pay.keeal.test/cs_sub_price" } },
        (req) => {
          recorded = req;
        }
      ),
    });

    const params = {
      mode: "subscription" as const,
      line_items: [{ price: "price_catalog_abc", quantity: 1 }],
      success_url: "https://shop.test/welcome",
      cancel_url: "https://shop.test/pricing",
    };

    await checkout.createSession(params);

    const body = JSON.parse(recorded!.body!);
    expect(body.mode).toBe("subscription");
    expect(body.line_items).toEqual([{ price: "price_catalog_abc", quantity: 1 }]);
    expect(recorded?.headers["idempotency-key"]).toBeTruthy();
  });

  it("POSTs subscription mode with subscription_data in the body", async () => {
    let recorded: RecordedRequest | undefined;

    const checkout = new KeealCheckout({
      apiKey: "keeal_sk_test",
      baseUrl: "https://api.keeal.test/api",
      fetchImpl: createMockFetch(
        { body: { id: "cs_sub", url: "https://pay.keeal.test/cs_sub" } },
        (req) => {
          recorded = req;
        }
      ),
    });

    const params = {
      mode: "subscription" as const,
      subscription_data: {
        price_id: "price_catalog_abc",
        auto_charge_enabled: true,
      },
      success_url: "https://shop.test/welcome",
      cancel_url: "https://shop.test/pricing",
    };

    await checkout.createSession(params);

    const body = JSON.parse(recorded!.body!);
    expect(body.mode).toBe("subscription");
    expect(body.subscription_data).toEqual({
      price_id: "price_catalog_abc",
      auto_charge_enabled: true,
    });
    expect(recorded?.headers["idempotency-key"]).toBeTruthy();
  });

  it("retrieveSession skips Authorization header", async () => {
    let recorded: RecordedRequest | undefined;

    const checkout = new KeealCheckout({
      apiKey: "keeal_sk_test",
      baseUrl: "https://api.keeal.test/api",
      fetchImpl: createMockFetch(
        {
          body: {
            id: "int",
            sessionId: "cs_public",
            contractorId: "c",
            lineItems: [],
            amountCents: 100,
            currency: "USD",
            status: "open",
            successUrl: null,
            cancelUrl: null,
            customerEmail: null,
          },
        },
        (req) => {
          recorded = req;
        }
      ),
    });

    const session = await checkout.retrieveSession("cs_public");

    expect(session.sessionId).toBe("cs_public");
    expect(recorded?.method).toBe("GET");
    expect(recorded?.url).toBe("https://api.keeal.test/api/checkout/sessions/cs_public");
    expect(recorded?.headers.authorization).toBeUndefined();
  });

  it("createPayment still posts to legacy /pay with idempotency (deprecated)", async () => {
    let recorded: RecordedRequest | undefined;

    const checkout = new KeealCheckout({
      apiKey: "keeal_sk_test",
      baseUrl: "https://api.keeal.test/api",
      fetchImpl: createMockFetch(
        { body: { paymentId: "pay_1", clientSecret: "pi_secret" } },
        (req) => {
          recorded = req;
        }
      ),
    });

    const result = await checkout.createPayment("cs_legacy", { amountCents: 500 });

    expect(result.paymentId).toBe("pay_1");
    expect(recorded?.url).toBe("https://api.keeal.test/api/checkout/sessions/cs_legacy/pay");
    expect(recorded?.headers.authorization).toBeUndefined();
    expect(recorded?.headers["idempotency-key"]).toBeTruthy();
    expect(JSON.parse(recorded!.body!)).toEqual({ amountCents: 500 });
  });
});
