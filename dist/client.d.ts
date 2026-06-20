import type { CreateCheckoutSessionParams, CreateCheckoutSessionResult, CreatePaymentParams, CreatePaymentResult, CheckoutSession, KeealCheckoutOptions, MerchantCheckoutSessionDetail, MerchantCheckoutSessionsListResult, PayPalCaptureParams, PayPalCreateOrderParams, PayPalCreateOrderResult } from "./types.js";
/**
 * Server-side Keeal client for **hosted checkout**.
 *
 * Recommended flow: `createSession` → redirect customer to `url` → handle `checkout.session.completed` webhooks.
 */
export declare class KeealCheckout {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly fetchImpl;
    private readonly defaultHeaders;
    constructor(options: KeealCheckoutOptions);
    private buildHeaders;
    private requestJson;
    private requestEmpty;
    /**
     * Create a checkout session (requires API key). Use only on your server.
     * Sends `Idempotency-Key` (generated if omitted in options).
     */
    createSession(params: CreateCheckoutSessionParams, options?: {
        idempotencyKey?: string;
    }): Promise<CreateCheckoutSessionResult>;
    /**
     * Create session and return the hosted checkout URL (convenience).
     */
    createSessionUrl(params: CreateCheckoutSessionParams, options?: {
        idempotencyKey?: string;
    }): Promise<string>;
    /**
     * List checkout sessions for your contractor (newest first). Requires API key.
     */
    listMerchantSessions(options?: {
        limit?: number;
        page?: number;
    }): Promise<MerchantCheckoutSessionsListResult>;
    /**
     * Get one checkout session by public id (`cs_...`) with payments. Contractor-scoped; requires API key.
     */
    retrieveMerchantSession(sessionId: string): Promise<MerchantCheckoutSessionDetail>;
    /**
     * Fetch a checkout session (public endpoint; no API key sent).
     * For merchant-scoped detail with payments, use {@link retrieveMerchantSession}.
     */
    retrieveSession(sessionId: string): Promise<CheckoutSession>;
    /**
     * Start payment for a session (public). API requires `Idempotency-Key`; generated if omitted.
     *
     * @deprecated Hosted checkout is the supported integration. Redirect customers to the session `url`
     * instead of calling `/pay` from your app. Use {@link KeealCheckoutPublic.createPayment} only for
     * legacy custom checkout UIs.
     */
    createPayment(sessionId: string, params: CreatePaymentParams, options?: {
        idempotencyKey?: string;
    }): Promise<CreatePaymentResult>;
    /**
     * Cancel session (public). `204` on success.
     *
     * @deprecated Legacy custom checkout — hosted checkout handles cancellation on Keeal's pay page.
     */
    cancelSession(sessionId: string): Promise<void>;
    /**
     * Abandon session (public). `204` on success.
     *
     * @deprecated Legacy custom checkout — hosted checkout tracks abandonment automatically.
     */
    abandonSession(sessionId: string): Promise<void>;
    /**
     * PayPal create-order (public). Body must match session total.
     *
     * @deprecated PayPal is handled on Keeal's hosted checkout page for new integrations.
     */
    paypalCreateOrder(sessionId: string, params: PayPalCreateOrderParams): Promise<PayPalCreateOrderResult>;
    /**
     * PayPal capture (public).
     *
     * @deprecated PayPal is handled on Keeal's hosted checkout page for new integrations.
     */
    paypalCapture(sessionId: string, params: PayPalCaptureParams): Promise<Record<string, unknown>>;
}
/**
 * Public (unauthenticated) client for legacy custom checkout UIs.
 *
 * @deprecated Use **hosted checkout** ({@link KeealCheckout.createSession} + redirect to `url`).
 * Keeal does not offer custom `/pay` integrations to new merchants; this class remains for backward compatibility.
 */
export declare class KeealCheckoutPublic {
    private readonly baseUrl;
    private readonly fetchImpl;
    private readonly defaultHeaders;
    constructor(options: {
        baseUrl: string;
        fetchImpl?: typeof fetch;
        defaultHeaders?: Record<string, string>;
    });
    private buildHeaders;
    private requestJson;
    private requestEmpty;
    retrieveSession(sessionId: string): Promise<CheckoutSession>;
    /**
     * @deprecated Use hosted checkout instead of calling `/pay` from your front-end.
     */
    createPayment(sessionId: string, params: CreatePaymentParams, options?: {
        idempotencyKey?: string;
    }): Promise<CreatePaymentResult>;
    /** @deprecated Legacy custom checkout — use hosted checkout. */
    cancelSession(sessionId: string): Promise<void>;
    /** @deprecated Legacy custom checkout — use hosted checkout. */
    abandonSession(sessionId: string): Promise<void>;
    /** @deprecated PayPal is handled on Keeal's hosted checkout page. */
    paypalCreateOrder(sessionId: string, params: PayPalCreateOrderParams): Promise<PayPalCreateOrderResult>;
    /** @deprecated PayPal is handled on Keeal's hosted checkout page. */
    paypalCapture(sessionId: string, params: PayPalCaptureParams): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=client.d.ts.map