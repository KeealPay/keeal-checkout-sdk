export interface KeealApiErrorBody {
    error?: string;
    message?: string;
    details?: unknown;
}
export declare class KeealCheckoutError extends Error {
    readonly status: number;
    readonly code?: string;
    readonly details?: unknown;
    readonly body?: KeealApiErrorBody;
    constructor(message: string, options: {
        status: number;
        code?: string;
        details?: unknown;
        body?: KeealApiErrorBody;
    });
    static isKeealCheckoutError(e: unknown): e is KeealCheckoutError;
}
//# sourceMappingURL=errors.d.ts.map