export interface ErrorPayload {
  success: false;
  error: string;
  message?: string | string[];
  statusCode?: number;
  timestamp?: string;
  path?: string;
  retryAfter?: number;
}

export class ChatmaidError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: string[];
  readonly path: string | undefined;
  readonly requestId: string | undefined;

  constructor(opts: {
    status: number;
    code: string;
    message: string;
    details?: string[];
    path?: string;
    requestId?: string;
  }) {
    super(opts.message);
    this.name = "ChatmaidError";
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details ?? [opts.message];
    this.path = opts.path;
    this.requestId = opts.requestId;
  }
}

export class AuthenticationError extends ChatmaidError {
  constructor(opts: ConstructorParameters<typeof ChatmaidError>[0]) {
    super(opts);
    this.name = "AuthenticationError";
  }
}

export class PermissionError extends ChatmaidError {
  constructor(opts: ConstructorParameters<typeof ChatmaidError>[0]) {
    super(opts);
    this.name = "PermissionError";
  }
}

export class ValidationError extends ChatmaidError {
  constructor(opts: ConstructorParameters<typeof ChatmaidError>[0]) {
    super(opts);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends ChatmaidError {
  constructor(opts: ConstructorParameters<typeof ChatmaidError>[0]) {
    super(opts);
    this.name = "NotFoundError";
  }
}

export class RateLimitError extends ChatmaidError {
  readonly retryAfter: number | undefined;

  constructor(
    opts: ConstructorParameters<typeof ChatmaidError>[0] & {
      retryAfter?: number;
    },
  ) {
    super(opts);
    this.name = "RateLimitError";
    this.retryAfter = opts.retryAfter;
  }
}

export class ServerError extends ChatmaidError {
  constructor(opts: ConstructorParameters<typeof ChatmaidError>[0]) {
    super(opts);
    this.name = "ServerError";
  }
}

export class NetworkError extends ChatmaidError {
  constructor(message: string, cause?: unknown) {
    super({ status: 0, code: "NetworkError", message });
    this.name = "NetworkError";
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
  }
}

export function errorFromResponse(
  status: number,
  payload: ErrorPayload | undefined,
  requestId: string | undefined,
): ChatmaidError {
  const code = payload?.error || `HTTP_${status}`;
  const rawMessage = payload?.message;
  const details = Array.isArray(rawMessage)
    ? rawMessage
    : rawMessage
      ? [rawMessage]
      : [code];
  const message = details[0] ?? code;
  const path = payload?.path;
  const base = { status, code, message, details, path, requestId };

  if (status === 401) return new AuthenticationError(base);
  if (status === 403) return new PermissionError(base);
  if (status === 404) return new NotFoundError(base);
  if (status === 429)
    return new RateLimitError({ ...base, retryAfter: payload?.retryAfter });
  if (status >= 400 && status < 500) return new ValidationError(base);
  if (status >= 500) return new ServerError(base);
  return new ChatmaidError(base);
}
