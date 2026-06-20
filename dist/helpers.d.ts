/**
 * Normalize API base URL (single trailing slash removed).
 */
export declare function normalizeBaseUrl(baseUrl: string): string;
/**
 * True if string looks like a checkout session id (`cs_...`).
 */
export declare function isCheckoutSessionId(value: string): boolean;
/**
 * Browser / Node: redirect the current window to hosted checkout.
 */
export declare function redirectToCheckout(checkoutUrl: string): void;
/**
 * Open hosted checkout in a new tab (browser only).
 */
export declare function openCheckoutInNewTab(checkoutUrl: string): void;
/**
 * Client-side guard: all line items must share the same currency (matches server validation).
 */
export declare function assertSingleCurrency(lineItems: {
    price_data: {
        currency: string;
    };
}[]): void;
/**
 * Sum line items in minor units (same logic as server preview; server still authoritatively totals).
 */
export declare function previewTotalCents(lineItems: {
    price_data: {
        unit_amount: number;
    };
    quantity: number;
}[]): number;
declare function randomIdempotencyKey(): string;
export { randomIdempotencyKey };
//# sourceMappingURL=helpers.d.ts.map