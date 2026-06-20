import type { KeealWebhookEvent } from "./types.js";
export declare const KEEAL_SIGNATURE_HEADER = "X-Keeal-Signature";
export declare const KEEAL_EVENT_HEADER = "X-Keeal-Event";
export interface VerifyWebhookSignatureOptions {
    /** Reject signatures older than this many seconds (default 300). Set 0 to skip. */
    toleranceSeconds?: number;
}
/**
 * Verify `X-Keeal-Signature` on the **raw** request body (do not re-stringify JSON).
 *
 * Header format: `t=<unix_seconds>,v1=<hex_hmac>` where HMAC-SHA256 is computed over `<t>.<rawBody>`.
 */
export declare function verifyWebhookSignature(rawBody: string | Buffer, signatureHeader: string, signingSecret: string, options?: VerifyWebhookSignatureOptions): boolean;
/**
 * Verify signature and parse the webhook JSON envelope.
 * @throws Error when signature is invalid or JSON cannot be parsed.
 */
export declare function constructWebhookEvent(rawBody: string, signatureHeader: string, signingSecret: string, options?: VerifyWebhookSignatureOptions): KeealWebhookEvent;
/**
 * @deprecated Use {@link verifyWebhookSignature} — same behavior, clearer name.
 */
export declare function verifyKeealWebhookSignature(rawBody: string, signatureHeader: string, whsecSigningSecret: string): boolean;
//# sourceMappingURL=webhook.d.ts.map