# @keeal/checkout-sdk

Official **Node.js** SDK for Keeal **hosted checkout**. Create sessions on your server, redirect buyers to Keeal's pay page, and verify webhooks.

[![Node](https://img.shields.io/badge/Node-18+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](./package.json)

Requires **Node 18+**.

## Install

```bash
npm install @keeal/checkout-sdk
```

**This monorepo:**

```json
{
  "dependencies": {
    "@keeal/checkout-sdk": "file:./typescript"
  }
}
```

Run `npm run build` in `typescript/` so `dist/` exists before consuming via `file:`.

## Quick start (hosted checkout)

```ts
import { KeealCheckout } from "@keeal/checkout-sdk";

const checkout = new KeealCheckout({
  apiKey: process.env.KEEAL_API_KEY!, // keeal_sk_...
  baseUrl: "https://api.keeal.com/api",
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

// Return `url` to the browser and redirect, or use helpers:
// redirectToCheckout(url);
```

Configure a webhook URL in **Settings → API Keys → Webhook** and handle `checkout.session.completed`:

```ts
import {
  constructWebhookEvent,
  KEEAL_SIGNATURE_HEADER,
} from "@keeal/checkout-sdk";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get(KEEAL_SIGNATURE_HEADER) ?? "";

  const event = constructWebhookEvent(rawBody, signature, process.env.KEEAL_WEBHOOK_SECRET!);

  if (event.type === "checkout.session.completed") {
    const order = event.data.object;
    // order.client_reference_id, order.transaction_id, order.metadata
  }

  return new Response("ok", { status: 200 });
}
```

## API reference

### `KeealCheckout` (server only)

| Method | Description |
|--------|-------------|
| `createSession(params)` | `POST /checkout/sessions` — returns `{ id, url }` |
| `createSessionUrl(params)` | Same as above; returns `url` only |
| `listMerchantSessions({ limit, page })` | `GET /checkout/merchant/sessions` |
| `retrieveMerchantSession(sessionId)` | `GET /checkout/merchant/sessions/:id` (with `payments[]`) |
| `retrieveSession(sessionId)` | Public `GET /checkout/sessions/:id` (no auth header) |
| `createPayment(sessionId, params)` | **Deprecated** — legacy custom `/pay` flow |

### Subscription checkout

Pass `mode: "subscription"` with catalog or inline plan fields:

```ts
await checkout.createSession({
  mode: "subscription",
  subscription_data: { price_id: "price_abc123" },
  success_url: "https://yoursite.com/welcome",
  cancel_url: "https://yoursite.com/pricing",
});
```

Subscription lifecycle events (`subscription.created`, `subscription.activated`, etc.) use the same webhook URL and signing secret as checkout.

### Webhook helpers

| Export | Role |
|--------|------|
| `verifyWebhookSignature(rawBody, header, whsec)` | Returns `boolean` |
| `constructWebhookEvent(rawBody, header, whsec)` | Verify + parse JSON envelope |
| `verifyKeealWebhookSignature(...)` | Alias for `verifyWebhookSignature` |
| `KEEAL_SIGNATURE_HEADER` | `"X-Keeal-Signature"` |
| `KEEAL_EVENT_HEADER` | `"X-Keeal-Event"` |

Always verify signatures on the **raw** request body bytes.

### Browser helpers

| Export | Role |
|--------|------|
| `redirectToCheckout(url)` | `window.location.href = url` |
| `openCheckoutInNewTab(url)` | `window.open(url, "_blank")` |
| `assertSingleCurrency(line_items)` | Client-side guard before create |
| `previewTotalCents(line_items)` | Sum minor units (server still authoritative) |

### Errors

```ts
import { KeealCheckoutError } from "@keeal/checkout-sdk";

try {
  await checkout.createSession({ line_items: [] });
} catch (e) {
  if (KeealCheckoutError.isKeealCheckoutError(e)) {
    console.error(e.status, e.message, e.details);
  }
}
```

## Legacy API (backward compatible)

These remain exported but are **not** offered to new merchants:

| Symbol | Replacement |
|--------|-------------|
| `KeealCheckoutPublic` | Hosted checkout — no public API key client needed |
| `KeealCheckout.createPayment` | Redirect to session `url` |
| `KeealCheckoutPublic.createPayment` | Same |
| PayPal / cancel / abandon helpers | Handled on Keeal's hosted pay page |

## Security

- **`keeal_sk_` keys belong only on your server.** Never bundle them in browser or mobile clients.
- Webhook signing secrets (`whsec_...`) are server-only.
- For hosted checkout you only need `KeealCheckout` on the backend.

## Development

```bash
cd typescript
npm install
npm run build
npm run check-types
npm run lint
```

## License

**MIT** — see [`package.json`](./package.json).
