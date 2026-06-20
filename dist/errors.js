export class KeealCheckoutError extends Error {
    status;
    code;
    details;
    body;
    constructor(message, options) {
        super(message);
        this.name = "KeealCheckoutError";
        this.status = options.status;
        this.code = options.code;
        this.details = options.details;
        this.body = options.body;
    }
    static isKeealCheckoutError(e) {
        return e instanceof KeealCheckoutError;
    }
}
