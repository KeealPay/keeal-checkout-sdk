export interface KeealApiErrorBody {
  error?: string;
  message?: string;
  details?: unknown;
}

export class KeealCheckoutError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;
  readonly body?: KeealApiErrorBody;

  constructor(
    message: string,
    options: {
      status: number;
      code?: string;
      details?: unknown;
      body?: KeealApiErrorBody;
    }
  ) {
    super(message);
    this.name = "KeealCheckoutError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.body = options.body;
  }

  static isKeealCheckoutError(e: unknown): e is KeealCheckoutError {
    return e instanceof KeealCheckoutError;
  }
}
