# @keeal/checkout-sdk

Official **Node.js** SDK for Keeal **hosted checkout**. Create sessions on your server, redirect buyers to Keeal's payment page, and verify webhooks.

[![Node](https://img.shields.io/badge/Node-18+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

**Repository:** [github.com/KeealPay/keeal-checkout-sdk](https://github.com/KeealPay/keeal-checkout-sdk)

---

## Overview

Keeal **hosted checkout** is a redirect-based payment flow:

1. **Create a session** on your server with your secret API key (`keeal_sk_…`).
2. **Redirect** the customer to the session `url` returned by the API.
3. **Fulfill** your order when you receive a signed `checkout.session.completed` webhook.

Your server never handles card data. Payment UI, PayPal, and cancellation are handled on Keeal's hosted page.

---

## Installation

```bash
npm install @keeal/checkout-sdk
```

Requires **Node.js 18+**.

---

## Configuration

Set these environment variables on your server (never in client bundles):

| Variable | Description |
|----------|-------------|
| `KEEAL_API_KEY` | Secret API key (`keeal_sk_…`) from the Keeal dashboard |
| `KEEAL_BASE_URL` | API base URL including `/api`, e.g. `https://api.keeal.com/api` |
| `KEEAL_WEBHOOK_SECRET` | Webhook signing secret (`whsec_…`) from **Settings → API Keys → Webhook** |

Use separate keys, base URLs, and webhook secrets for staging and production.

---

## Quick start

```ts
import { KeealCheckout } from "@keeal/checkout-sdk";

const checkout = new KeealCheckout({
  apiKey: process.env.KEEAL_API_KEY!,
  baseUrl: process.env.KEEAL_BASE_URL!,
});

const { url } = await checkout.createSession({
  line_items: [
    {
      price_data: {
        currency: "usd",
        product_data: { name: "Pro plan" },
        unit_amount: 2900,
      },
      quantity: 1,
    },
  ],
  success_url: "https://yoursite.com/thanks",
  cancel_url: "https://yoursite.com/cart",
  client_reference_id: "order-123",
});

// Redirect the browser to `url` (or return it from your API route).
```

---

## API reference

### `KeealCheckout`

Server-side client. Requires your secret API key.

| Method | Signature | Description | Status |
|--------|-----------|-------------|--------|
| Constructor | `new KeealCheckout(options)` | `options.apiKey` and `options.baseUrl` are required. Optional: `fetchImpl`, `defaultHeaders`. | Hosted |
| `createSession` | `createSession(params, options?)` → `Promise<{ id, url }>` | Create a checkout session. Sends `Idempotency-Key` (auto-generated if omitted). | Hosted |
| `createSessionUrl` | `createSessionUrl(params, options?)` → `Promise<string>` | Convenience wrapper; returns the hosted checkout `url`. | Hosted |
| `listMerchantSessions` | `listMerchantSessions({ limit?, page? }?)` → `Promise<MerchantCheckoutSessionsListResult>` | List your checkout sessions (newest first). | Hosted |
| `retrieveMerchantSession` | `retrieveMerchantSession(sessionId)` → `Promise<MerchantCheckoutSessionDetail>` | Get one session by `cs_…` id, including `payments[]`. | Hosted |
| `retrieveSession` | `retrieveSession(sessionId)` → `Promise<CheckoutSession>` | Public session lookup (no API key sent). | Hosted |
| `createPayment` | `createPayment(sessionId, params, options?)` → `Promise<CreatePaymentResult>` | Legacy custom `/pay` flow. | **Deprecated** |
| `cancelSession` | `cancelSession(sessionId)` → `Promise<void>` | Legacy session cancel. | **Deprecated** |
| `abandonSession` | `abandonSession(sessionId)` → `Promise<void>` | Legacy session abandon. | **Deprecated** |
| `paypalCreateOrder` | `paypalCreateOrder(sessionId, params)` → `Promise<PayPalCreateOrderResult>` | Legacy PayPal create-order. | **Deprecated** |
| `paypalCapture` | `paypalCapture(sessionId, params)` → `Promise<Record<string, unknown>>` | Legacy PayPal capture. | **Deprecated** |

### `KeealCheckoutPublic`

Unauthenticated client for legacy custom checkout UIs. **Not recommended for new integrations.**

| Method | Signature | Description | Status |
|--------|-----------|-------------|--------|
| Constructor | `new KeealCheckoutPublic({ baseUrl, fetchImpl?, defaultHeaders? })` | No API key required. | **Deprecated** |
| `retrieveSession` | `retrieveSession(sessionId)` → `Promise<CheckoutSession>` | Public session lookup. | **Deprecated** |
| `createPayment` | `createPayment(sessionId, params, options?)` → `Promise<CreatePaymentResult>` | Legacy `/pay` from a custom UI. | **Deprecated** |
| `cancelSession` | `cancelSession(sessionId)` → `Promise<void>` | Legacy cancel. | **Deprecated** |
| `abandonSession` | `abandonSession(sessionId)` → `Promise<void>` | Legacy abandon. | **Deprecated** |
| `paypalCreateOrder` | `paypalCreateOrder(sessionId, params)` → `Promise<PayPalCreateOrderResult>` | Legacy PayPal. | **Deprecated** |
| `paypalCapture` | `paypalCapture(sessionId, params)` → `Promise<Record<string, unknown>>` | Legacy PayPal. | **Deprecated** |

### Webhook helpers

| Export | Signature | Description |
|--------|-----------|-------------|
| `verifyWebhookSignature` | `verifyWebhookSignature(rawBody, signatureHeader, signingSecret, options?)` → `boolean` | Verify `X-Keeal-Signature` on the **raw** request body. |
| `constructWebhookEvent` | `constructWebhookEvent(rawBody, signatureHeader, signingSecret, options?)` → `KeealWebhookEvent` | Verify signature and parse the JSON envelope. Throws on failure. |
| `verifyKeealWebhookSignature` | `verifyKeealWebhookSignature(rawBody, signatureHeader, whsec)` → `boolean` | Alias for `verifyWebhookSignature`. |
| `KEEAL_SIGNATURE_HEADER` | — | `"X-Keeal-Signature"` |
| `KEEAL_EVENT_HEADER` | — | `"X-Keeal-Event"` |

### Browser helpers

| Export | Signature | Description |
|--------|-----------|-------------|
| `redirectToCheckout` | `redirectToCheckout(url)` → `void` | Set `window.location.href` to the session URL. |
| `openCheckoutInNewTab` | `openCheckoutInNewTab(url)` → `void` | Open session URL in a new tab. |
| `assertSingleCurrency` | `assertSingleCurrency(line_items)` → `void` | Client-side guard: throws if line items mix currencies. |
| `previewTotalCents` | `previewTotalCents(line_items)` → `number` | Sum line-item minor units (server total is authoritative). |

### Utilities & errors

| Export | Description |
|--------|-------------|
| `normalizeBaseUrl(url)` | Ensure base URL ends with `/api`. |
| `isCheckoutSessionId(id)` | Returns `true` for `cs_…` session ids. |
| `randomIdempotencyKey()` | Generate a UUID for `Idempotency-Key`. |
| `KeealCheckoutError` | Typed API error with `status`, `message`, `details`, `body`. Use `KeealCheckoutError.isKeealCheckoutError(e)`. |

---

## Webhook verification

Configure your webhook URL in the Keeal dashboard. Handle events on the **raw** request body — do not re-serialize JSON before verifying.

```ts
import {
  constructWebhookEvent,
  KEEAL_SIGNATURE_HEADER,
} from "@keeal/checkout-sdk";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get(KEEAL_SIGNATURE_HEADER) ?? "";

  const event = constructWebhookEvent(
    rawBody,
    signature,
    process.env.KEEAL_WEBHOOK_SECRET!,
  );

  if (event.type === "checkout.session.completed") {
    const order = event.data.object;
    // order.client_reference_id, order.transaction_id, order.metadata
  }

  return new Response("ok", { status: 200 });
}
```

Signature format: `t=<unix_seconds>,v1=<hex_hmac>` where HMAC-SHA256 is computed over `<t>.<rawBody>` using your `whsec_…` secret.

---

## Subscription checkout

Pass `mode: "subscription"` when creating a session:

```ts
await checkout.createSession({
  mode: "subscription",
  subscription_data: { price_id: "price_abc123" },
  success_url: "https://yoursite.com/welcome",
  cancel_url: "https://yoursite.com/pricing",
});
```

Subscription lifecycle events (`subscription.created`, `subscription.activated`, etc.) are delivered to the same webhook URL and verified with the same signing secret as checkout events.

---

## Legacy & deprecated APIs

These symbols remain exported for backward compatibility but are **not offered to new merchants**:

| Symbol | Use instead |
|--------|-------------|
| `KeealCheckoutPublic` | `KeealCheckout.createSession()` + redirect to `url` |
| `KeealCheckout.createPayment()` | Redirect to session `url` |
| `KeealCheckoutPublic.createPayment()` | Redirect to session `url` |
| `cancelSession` / `abandonSession` | Handled on Keeal's hosted pay page |
| `paypalCreateOrder` / `paypalCapture` | Handled on Keeal's hosted pay page |

---

## Security

- **`keeal_sk_…` keys belong only on your server.** Never bundle them in browser or mobile clients.
- Webhook signing secrets (`whsec_…`) are server-only.
- For hosted checkout you only need `KeealCheckout` on the backend.

---

## Development

```bash
npm install
npm run build
npm run check-types
npm run lint
npm test
```

### End-to-end tests (optional)

Against a local or staging API with a test secret key:

```bash
export KEEAL_E2E=1
export KEEAL_API_KEY=keeal_sk_test_…
export KEEAL_BASE_URL=http://localhost:8000/api
export KEEAL_E2E_PRICE_ID=price_…   # optional subscription E2E
npm run test:e2e
```

---

## License

**MIT** — see [`LICENSE`](./LICENSE).
