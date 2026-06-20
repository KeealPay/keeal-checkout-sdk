/**
 * Stripe-style line item (matches POST /api/checkout/sessions body).
 */
export interface CheckoutLineItem {
  price_data: {
    currency: string;
    product_data: {
      name: string;
      description?: string;
      images?: string[];
    };
    unit_amount: number;
  };
  quantity: number;
}

export interface CreateCheckoutSessionParams {
  line_items?: CheckoutLineItem[];
  /** `payment` (default) or `subscription` */
  mode?: "payment" | "subscription";
  /** Required when mode is subscription (same shape as dashboard invoice/link subscription). */
  subscription?: {
    enabled: boolean;
    priceId?: string;
    name?: string;
    amountCents?: number;
    currency?: string;
    interval?: "weekly" | "monthly";
    intervalDay?: number;
    autoChargeEnabled?: boolean;
  };
  /** Stripe-style alias: `{ price_id: "..." }` when using catalog prices */
  subscription_data?: {
    price_id?: string;
    priceId?: string;
    auto_charge_enabled?: boolean;
    autoChargeEnabled?: boolean;
  };
  success_url?: string;
  cancel_url?: string;
  customer_email?: string;
  client_reference_id?: string;
  /** Merchant page URL where checkout was initiated. */
  source_url?: string;
  /** Merchant site hostname, captured automatically at session creation when possible. */
  source_host?: string;
  metadata?: Record<string, string>;
}

export interface CreateCheckoutSessionResult {
  id: string;
  url: string;
}

export interface CheckoutSessionLineItem {
  price_data: {
    currency: string;
    product_data: { name: string; description?: string; images?: string[] };
    unit_amount: number;
  };
  quantity: number;
}

export interface CheckoutSessionSuccessfulPayment {
  id: string;
  status: string;
  createdAt: string;
  clientEmail: string | null;
  clientName: string | null;
  amountCents: number;
  receiptUrl: string | null;
}

export interface CheckoutSessionTransactionSettings {
  minPaymentAmountCents: number;
  maxPaymentAmountCents: number | null;
  currency: string;
}

export interface CheckoutSessionContractor {
  firstName: string;
  lastName: string;
  cardEnabled: boolean;
  paymentProfile?: {
    businessName?: string;
    logoUrl?: string;
    brandColor?: string;
  };
}

/**
 * Response shape from GET /api/checkout/sessions/:sessionId
 */
export interface CheckoutSession {
  id: string;
  sessionId: string;
  contractorId: string;
  mode?: "payment" | "subscription";
  subscription?: {
    enabled?: boolean;
    name?: string | null;
    amountCents?: number;
    currency?: string;
    interval?: string;
    intervalDay?: number;
    autoChargeEnabled?: boolean;
  } | null;
  lineItems: CheckoutSessionLineItem[];
  amountCents: number;
  currency: string;
  status: string;
  successUrl: string | null;
  cancelUrl: string | null;
  customerEmail: string | null;
  /** Present when merchant set metadata.customer_name at session creation */
  customerName?: string | null;
  clientReferenceId?: string | null;
  metadata?: Record<string, unknown>;
  hasSuccessfulPayment?: boolean;
  successfulPayment?: CheckoutSessionSuccessfulPayment;
  transactionSettings?: CheckoutSessionTransactionSettings;
  contractor?: CheckoutSessionContractor;
  expiresAt?: string;
  /** Hosted GET: when `status` is `paid`, true if payment is held for fraud review (Stripe). Pair with webhook `payment_status`. */
  paymentRequiresReview?: boolean;
  /** Hosted page may offer PayPal when true (contractor + platform configured). */
  paypalEnabled?: boolean;
  /** PayPal Smart Button public client id, or null when PayPal not offered. */
  paypalClientId?: string | null;
}

export interface CreatePaymentParams {
  amountCents: number;
  clientEmail?: string;
  clientName?: string;
  paymentMethodTypes?: string[];
}

export interface CreatePaymentResult {
  paymentId: string;
  clientSecret: string | null;
}

/** POST /checkout/sessions/:id/paypal/create-order */
export interface PayPalCreateOrderParams {
  amountCents: number;
  clientEmail?: string;
  clientName?: string;
}

export interface PayPalCreateOrderResult {
  orderId: string;
  paymentId: string;
}

/** POST /checkout/sessions/:id/paypal/capture */
export interface PayPalCaptureParams {
  orderId: string;
}

/** Row from GET /checkout/merchant/sessions */
export interface MerchantCheckoutSessionSummary {
  id: string;
  sessionId: string;
  status: string;
  amountCents: number;
  currency: string;
  clientReferenceId: string | null;
  customerEmail: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantCheckoutSessionsListResult {
  object: "list";
  data: MerchantCheckoutSessionSummary[];
  has_more: boolean;
  page: number;
  limit: number;
}

export interface MerchantCheckoutPaymentRow {
  id: string;
  status: string;
  amountCents: number;
  currency: string;
  clientEmail: string | null;
  clientName: string | null;
  paymentMethodType: string | null;
  createdAt: string;
  stripePaymentIntentId: string | null;
}

/**
 * Full session from GET /checkout/merchant/sessions/:sessionId (contractor-scoped).
 * Shape follows the API JSON (Prisma serialization).
 */
export interface MerchantCheckoutSessionDetail {
  id: string;
  sessionId: string;
  contractorId: string;
  creatorApiKeyId: string | null;
  lineItems: unknown;
  amountCents: number;
  currency: string;
  status: string;
  expiresAt: string;
  successUrl: string | null;
  cancelUrl: string | null;
  errorUrl: string | null;
  clientReferenceId: string | null;
  customerEmail: string | null;
  sourceUrl?: string | null;
  referrerUrl?: string | null;
  landingPageUrl?: string | null;
  originRecordedAt?: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  payments: MerchantCheckoutPaymentRow[];
}

/** Checkout webhook event types (hosted checkout + subscriptions). */
export type KeealWebhookEventType =
  | "checkout.session.completed"
  | "checkout.session.payment_failed"
  | "checkout.session.expired"
  | "checkout.session.canceled"
  | "checkout.session.abandoned"
  | "subscription.created"
  | "subscription.activated"
  | "subscription.updated"
  | "subscription.cancelled"
  | "subscription.invoice_created"
  | "subscription.payment_failed";

export interface KeealWebhookEventObject {
  session_id?: string;
  client_reference_id?: string | null;
  transaction_id?: string | null;
  subscription_id?: string | null;
  amount_cents?: number;
  currency?: string;
  amount?: string;
  status?: string;
  payment_status?: string;
  customer_email?: string | null;
  customer_name?: string | null;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface KeealWebhookEvent {
  id: string;
  type: KeealWebhookEventType | string;
  created: number;
  data: {
    object: KeealWebhookEventObject;
  };
}

export interface KeealCheckoutOptions {
  /**
   * Secret API key (`keeal_sk_...`). Never expose in browser bundles.
   */
  apiKey: string;
  /**
   * API base URL including `/api`, e.g. `https://api.keeal.com/api` or `http://localhost:8000/api`
   */
  baseUrl: string;
  /** Override fetch (testing or custom HTTP client) */
  fetchImpl?: typeof fetch;
  /** Extra headers on every request */
  defaultHeaders?: Record<string, string>;
}
