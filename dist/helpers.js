/**
 * Normalize API base URL (single trailing slash removed).
 */
export function normalizeBaseUrl(baseUrl) {
    return baseUrl.replace(/\/+$/, "");
}
/**
 * True if string looks like a checkout session id (`cs_...`).
 */
export function isCheckoutSessionId(value) {
    return typeof value === "string" && value.startsWith("cs_") && value.length > 3;
}
/**
 * Browser / Node: redirect the current window to hosted checkout.
 */
export function redirectToCheckout(checkoutUrl) {
    if (typeof globalThis.location !== "undefined") {
        globalThis.location.href = checkoutUrl;
        return;
    }
    throw new Error("redirectToCheckout requires a browser environment (window.location)");
}
/**
 * Open hosted checkout in a new tab (browser only).
 */
export function openCheckoutInNewTab(checkoutUrl) {
    if (typeof globalThis.open === "function") {
        globalThis.open(checkoutUrl, "_blank", "noopener,noreferrer");
        return;
    }
    throw new Error("openCheckoutInNewTab requires a browser environment (window.open)");
}
/**
 * Client-side guard: all line items must share the same currency (matches server validation).
 */
export function assertSingleCurrency(lineItems) {
    if (lineItems.length === 0) {
        throw new Error("line_items must not be empty");
    }
    const codes = [...new Set(lineItems.map((i) => i.price_data.currency.toUpperCase()))];
    if (codes.length > 1) {
        throw new Error(`All line items must use the same currency; got: ${codes.join(", ")}`);
    }
}
/**
 * Sum line items in minor units (same logic as server preview; server still authoritatively totals).
 */
export function previewTotalCents(lineItems) {
    return lineItems.reduce((sum, item) => sum + item.price_data.unit_amount * item.quantity, 0);
}
function randomIdempotencyKey() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `keeal_${Date.now()}_${Math.random().toString(36).slice(2, 18)}`;
}
export { randomIdempotencyKey };
