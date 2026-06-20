import { createHmac, timingSafeEqual } from "node:crypto";
export const KEEAL_SIGNATURE_HEADER = "X-Keeal-Signature";
export const KEEAL_EVENT_HEADER = "X-Keeal-Event";
/**
 * Verify `X-Keeal-Signature` on the **raw** request body (do not re-stringify JSON).
 *
 * Header format: `t=<unix_seconds>,v1=<hex_hmac>` where HMAC-SHA256 is computed over `<t>.<rawBody>`.
 */
export function verifyWebhookSignature(rawBody, signatureHeader, signingSecret, options) {
    if (!signatureHeader?.trim() || !signingSecret?.trim()) {
        return false;
    }
    const parts = Object.fromEntries(signatureHeader.split(",").map((part) => {
        const eq = part.indexOf("=");
        if (eq === -1)
            return [part.trim(), ""];
        return [part.slice(0, eq).trim(), part.slice(eq + 1).trim()];
    }));
    const t = parts.t;
    const v1 = parts.v1;
    if (!t || !v1) {
        return false;
    }
    const tolerance = options?.toleranceSeconds ?? 300;
    if (tolerance > 0) {
        const ts = Number.parseInt(t, 10);
        if (!Number.isFinite(ts)) {
            return false;
        }
        const now = Math.floor(Date.now() / 1000);
        if (Math.abs(now - ts) > tolerance) {
            return false;
        }
    }
    const body = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
    const signed = `${t}.${body}`;
    const expected = createHmac("sha256", signingSecret).update(signed).digest("hex");
    try {
        const a = Buffer.from(v1, "hex");
        const b = Buffer.from(expected, "hex");
        if (a.length !== b.length) {
            return false;
        }
        return timingSafeEqual(a, b);
    }
    catch {
        return false;
    }
}
/**
 * Verify signature and parse the webhook JSON envelope.
 * @throws Error when signature is invalid or JSON cannot be parsed.
 */
export function constructWebhookEvent(rawBody, signatureHeader, signingSecret, options) {
    if (!verifyWebhookSignature(rawBody, signatureHeader, signingSecret, options)) {
        throw new Error("Invalid Keeal webhook signature");
    }
    return JSON.parse(rawBody);
}
/**
 * @deprecated Use {@link verifyWebhookSignature} — same behavior, clearer name.
 */
export function verifyKeealWebhookSignature(rawBody, signatureHeader, whsecSigningSecret) {
    return verifyWebhookSignature(rawBody, signatureHeader, whsecSigningSecret);
}
