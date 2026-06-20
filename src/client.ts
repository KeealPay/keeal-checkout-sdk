import type {
  CreateCheckoutSessionParams,
  CreateCheckoutSessionResult,
  CreatePaymentParams,
  CreatePaymentResult,
  CheckoutSession,
  KeealCheckoutOptions,
  MerchantCheckoutSessionDetail,
  MerchantCheckoutSessionsListResult,
  PayPalCaptureParams,
  PayPalCreateOrderParams,
  PayPalCreateOrderResult,
} from "./types.js";
import { KeealCheckoutError, type KeealApiErrorBody } from "./errors.js";
import { normalizeBaseUrl, randomIdempotencyKey } from "./helpers.js";

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

function throwForErrorResponse(res: Response, data: unknown): never {
  const d = data as KeealApiErrorBody & Record<string, unknown>;
  const message =
    typeof d?.message === "string"
      ? d.message
      : typeof d?.error === "string"
        ? d.error
        : `Request failed with status ${res.status}`;
  throw new KeealCheckoutError(message, {
    status: res.status,
    code: typeof d?.error === "string" ? d.error : undefined,
    details: d?.details,
    body: d,
  });
}

/**
 * Server-side Keeal client for **hosted checkout**.
 *
 * Recommended flow: `createSession` → redirect customer to `url` → handle `checkout.session.completed` webhooks.
 */
export class KeealCheckout {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly defaultHeaders: Record<string, string>;

  constructor(options: KeealCheckoutOptions) {
    if (!options.apiKey?.trim()) {
      throw new Error("KeealCheckout: apiKey is required");
    }
    if (!options.baseUrl?.trim()) {
      throw new Error("KeealCheckout: baseUrl is required");
    }
    this.apiKey = options.apiKey.trim();
    this.baseUrl = normalizeBaseUrl(options.baseUrl.trim());
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.defaultHeaders = options.defaultHeaders ?? {};
  }

  private buildHeaders(opts: {
    jsonBody: boolean;
    skipAuth: boolean;
    idempotencyKey?: string;
  }): Headers {
    const headers = new Headers({
      Accept: "application/json",
      ...this.defaultHeaders,
    });
    if (opts.jsonBody) {
      headers.set("Content-Type", "application/json");
    }
    if (!opts.skipAuth) {
      headers.set("Authorization", `Bearer ${this.apiKey}`);
    }
    if (opts.idempotencyKey) {
      headers.set("Idempotency-Key", opts.idempotencyKey);
    }
    return headers;
  }

  private async requestJson<T>(
    path: string,
    req: {
      method: string;
      body?: string;
      skipAuth?: boolean;
      idempotencyKey?: string;
    }
  ): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const skipAuth = req.skipAuth ?? false;
    const headers = this.buildHeaders({
      jsonBody: req.body != null,
      skipAuth,
      idempotencyKey: req.idempotencyKey,
    });
    const res = await this.fetchImpl(url, { method: req.method, headers, body: req.body });
    const data = (await readJson(res)) as KeealApiErrorBody & T;
    if (!res.ok) {
      throwForErrorResponse(res, data);
    }
    return data as T;
  }

  private async requestEmpty(path: string, skipAuth = false): Promise<void> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const headers = this.buildHeaders({ jsonBody: false, skipAuth });
    const res = await this.fetchImpl(url, { method: "POST", headers });
    const text = await res.text();
    if (res.ok && (res.status === 204 || (res.status >= 200 && res.status < 300 && text === ""))) {
      return;
    }
    let errBody: unknown = {};
    try {
      errBody = text ? JSON.parse(text) : {};
    } catch {
      errBody = { message: text };
    }
    if (!res.ok) {
      throwForErrorResponse(res, errBody);
    }
  }

  /**
   * Create a checkout session (requires API key). Use only on your server.
   * Sends `Idempotency-Key` (generated if omitted in options).
   */
  async createSession(
    params: CreateCheckoutSessionParams,
    options?: { idempotencyKey?: string }
  ): Promise<CreateCheckoutSessionResult> {
    const idempotencyKey = options?.idempotencyKey?.trim() || randomIdempotencyKey();
    return this.requestJson<CreateCheckoutSessionResult>("/checkout/sessions", {
      method: "POST",
      body: JSON.stringify(params),
      idempotencyKey,
    });
  }

  /**
   * Create session and return the hosted checkout URL (convenience).
   */
  async createSessionUrl(
    params: CreateCheckoutSessionParams,
    options?: { idempotencyKey?: string }
  ): Promise<string> {
    const { url } = await this.createSession(params, options);
    return url;
  }

  /**
   * List checkout sessions for your contractor (newest first). Requires API key.
   */
  async listMerchantSessions(options?: { limit?: number; page?: number }): Promise<MerchantCheckoutSessionsListResult> {
    const limit = options?.limit;
    const page = options?.page;
    const params = new URLSearchParams();
    if (limit != null) params.set("limit", String(limit));
    if (page != null) params.set("page", String(page));
    const q = params.toString();
    const p = q ? `/checkout/merchant/sessions?${q}` : "/checkout/merchant/sessions";
    return this.requestJson<MerchantCheckoutSessionsListResult>(p, { method: "GET" });
  }

  /**
   * Get one checkout session by public id (`cs_...`) with payments. Contractor-scoped; requires API key.
   */
  async retrieveMerchantSession(sessionId: string): Promise<MerchantCheckoutSessionDetail> {
    const encoded = encodeURIComponent(sessionId);
    return this.requestJson<MerchantCheckoutSessionDetail>(`/checkout/merchant/sessions/${encoded}`, {
      method: "GET",
    });
  }

  /**
   * Fetch a checkout session (public endpoint; no API key sent).
   * For merchant-scoped detail with payments, use {@link retrieveMerchantSession}.
   */
  async retrieveSession(sessionId: string): Promise<CheckoutSession> {
    const encoded = encodeURIComponent(sessionId);
    return this.requestJson<CheckoutSession>(`/checkout/sessions/${encoded}`, {
      method: "GET",
      skipAuth: true,
    });
  }

  /**
   * Start payment for a session (public). API requires `Idempotency-Key`; generated if omitted.
   *
   * @deprecated Hosted checkout is the supported integration. Redirect customers to the session `url`
   * instead of calling `/pay` from your app. Use {@link KeealCheckoutPublic.createPayment} only for
   * legacy custom checkout UIs.
   */
  async createPayment(
    sessionId: string,
    params: CreatePaymentParams,
    options?: { idempotencyKey?: string }
  ): Promise<CreatePaymentResult> {
    const encoded = encodeURIComponent(sessionId);
    const idempotencyKey = options?.idempotencyKey?.trim() || randomIdempotencyKey();
    return this.requestJson<CreatePaymentResult>(`/checkout/sessions/${encoded}/pay`, {
      method: "POST",
      body: JSON.stringify(params),
      skipAuth: true,
      idempotencyKey,
    });
  }

  /**
   * Cancel session (public). `204` on success.
   *
   * @deprecated Legacy custom checkout — hosted checkout handles cancellation on Keeal's pay page.
   */
  async cancelSession(sessionId: string): Promise<void> {
    const encoded = encodeURIComponent(sessionId);
    await this.requestEmpty(`/checkout/sessions/${encoded}/cancel`, true);
  }

  /**
   * Abandon session (public). `204` on success.
   *
   * @deprecated Legacy custom checkout — hosted checkout tracks abandonment automatically.
   */
  async abandonSession(sessionId: string): Promise<void> {
    const encoded = encodeURIComponent(sessionId);
    await this.requestEmpty(`/checkout/sessions/${encoded}/abandon`, true);
  }

  /**
   * PayPal create-order (public). Body must match session total.
   *
   * @deprecated PayPal is handled on Keeal's hosted checkout page for new integrations.
   */
  async paypalCreateOrder(sessionId: string, params: PayPalCreateOrderParams): Promise<PayPalCreateOrderResult> {
    const encoded = encodeURIComponent(sessionId);
    return this.requestJson<PayPalCreateOrderResult>(`/checkout/sessions/${encoded}/paypal/create-order`, {
      method: "POST",
      body: JSON.stringify(params),
      skipAuth: true,
    });
  }

  /**
   * PayPal capture (public).
   *
   * @deprecated PayPal is handled on Keeal's hosted checkout page for new integrations.
   */
  async paypalCapture(sessionId: string, params: PayPalCaptureParams): Promise<Record<string, unknown>> {
    const encoded = encodeURIComponent(sessionId);
    return this.requestJson<Record<string, unknown>>(`/checkout/sessions/${encoded}/paypal/capture`, {
      method: "POST",
      body: JSON.stringify(params),
      skipAuth: true,
    });
  }
}

/**
 * Public (unauthenticated) client for legacy custom checkout UIs.
 *
 * @deprecated Use **hosted checkout** ({@link KeealCheckout.createSession} + redirect to `url`).
 * Keeal does not offer custom `/pay` integrations to new merchants; this class remains for backward compatibility.
 */
export class KeealCheckoutPublic {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly defaultHeaders: Record<string, string>;

  constructor(options: { baseUrl: string; fetchImpl?: typeof fetch; defaultHeaders?: Record<string, string> }) {
    if (!options.baseUrl?.trim()) {
      throw new Error("KeealCheckoutPublic: baseUrl is required");
    }
    this.baseUrl = normalizeBaseUrl(options.baseUrl.trim());
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.defaultHeaders = options.defaultHeaders ?? {};
  }

  private buildHeaders(opts: { jsonBody: boolean; idempotencyKey?: string }): Headers {
    const headers = new Headers({
      Accept: "application/json",
      ...this.defaultHeaders,
    });
    if (opts.jsonBody) {
      headers.set("Content-Type", "application/json");
    }
    if (opts.idempotencyKey) {
      headers.set("Idempotency-Key", opts.idempotencyKey);
    }
    return headers;
  }

  private async requestJson<T>(
    path: string,
    req: { method: string; body?: string; idempotencyKey?: string }
  ): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const headers = this.buildHeaders({
      jsonBody: req.body != null,
      idempotencyKey: req.idempotencyKey,
    });
    const res = await this.fetchImpl(url, { method: req.method, headers, body: req.body });
    const data = (await readJson(res)) as KeealApiErrorBody & T;
    if (!res.ok) {
      throwForErrorResponse(res, data);
    }
    return data as T;
  }

  private async requestEmpty(path: string): Promise<void> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const headers = this.buildHeaders({ jsonBody: false });
    const res = await this.fetchImpl(url, { method: "POST", headers });
    const text = await res.text();
    if (res.ok && (res.status === 204 || (res.status >= 200 && res.status < 300 && text === ""))) {
      return;
    }
    let errBody: unknown = {};
    try {
      errBody = text ? JSON.parse(text) : {};
    } catch {
      errBody = { message: text };
    }
    if (!res.ok) {
      throwForErrorResponse(res, errBody);
    }
  }

  async retrieveSession(sessionId: string): Promise<CheckoutSession> {
    const encoded = encodeURIComponent(sessionId);
    return this.requestJson<CheckoutSession>(`/checkout/sessions/${encoded}`, { method: "GET" });
  }

  /**
   * @deprecated Use hosted checkout instead of calling `/pay` from your front-end.
   */
  async createPayment(
    sessionId: string,
    params: CreatePaymentParams,
    options?: { idempotencyKey?: string }
  ): Promise<CreatePaymentResult> {
    const encoded = encodeURIComponent(sessionId);
    const idempotencyKey = options?.idempotencyKey?.trim() || randomIdempotencyKey();
    return this.requestJson<CreatePaymentResult>(`/checkout/sessions/${encoded}/pay`, {
      method: "POST",
      body: JSON.stringify(params),
      idempotencyKey,
    });
  }

  /** @deprecated Legacy custom checkout — use hosted checkout. */
  async cancelSession(sessionId: string): Promise<void> {
    const encoded = encodeURIComponent(sessionId);
    await this.requestEmpty(`/checkout/sessions/${encoded}/cancel`);
  }

  /** @deprecated Legacy custom checkout — use hosted checkout. */
  async abandonSession(sessionId: string): Promise<void> {
    const encoded = encodeURIComponent(sessionId);
    await this.requestEmpty(`/checkout/sessions/${encoded}/abandon`);
  }

  /** @deprecated PayPal is handled on Keeal's hosted checkout page. */
  async paypalCreateOrder(sessionId: string, params: PayPalCreateOrderParams): Promise<PayPalCreateOrderResult> {
    const encoded = encodeURIComponent(sessionId);
    return this.requestJson<PayPalCreateOrderResult>(`/checkout/sessions/${encoded}/paypal/create-order`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  /** @deprecated PayPal is handled on Keeal's hosted checkout page. */
  async paypalCapture(sessionId: string, params: PayPalCaptureParams): Promise<Record<string, unknown>> {
    const encoded = encodeURIComponent(sessionId);
    return this.requestJson<Record<string, unknown>>(`/checkout/sessions/${encoded}/paypal/capture`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  }
}
