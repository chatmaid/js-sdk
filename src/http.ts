import { errorFromResponse, NetworkError, type ErrorPayload } from "./errors.js";

export interface HttpOptions {
  baseUrl: string;
  apiKey: string;
  fetch?: typeof globalThis.fetch;
  userAgent?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface RequestOptions {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  signal?: AbortSignal;
}

interface SuccessEnvelope<T> {
  success: true;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 500;

export class HttpClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly userAgent: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(opts: HttpOptions) {
    if (!opts.apiKey) throw new Error("Chatmaid SDK: apiKey is required");
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.apiKey = opts.apiKey;
    this.fetchImpl = opts.fetch ?? globalThis.fetch;
    if (!this.fetchImpl) {
      throw new Error(
        "Chatmaid SDK: global fetch is not available. Pass a fetch implementation via the `fetch` option.",
      );
    }
    this.userAgent = opts.userAgent ?? "chatmaid-sdk-js/0.3.0";
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  async request<T>(opts: RequestOptions): Promise<{
    data: T;
    pagination?: SuccessEnvelope<T>["pagination"];
  }> {
    const url = this.buildUrl(opts.path, opts.query);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
      "User-Agent": this.userAgent,
    };
    let body: string | undefined;
    if (opts.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(opts.body);
    }

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const ac = new AbortController();
      const timeout = setTimeout(() => ac.abort(), this.timeoutMs);
      const signal = mergeSignals(opts.signal, ac.signal);

      let response: Response;
      try {
        response = await this.fetchImpl(url, {
          method: opts.method,
          headers,
          body,
          signal,
        });
      } catch (cause) {
        clearTimeout(timeout);
        lastError = cause;
        if (attempt < this.maxRetries && isRetryableNetworkError(cause)) {
          await sleep(backoff(attempt));
          continue;
        }
        throw new NetworkError(
          `Network request to ${opts.method} ${opts.path} failed`,
          cause,
        );
      }
      clearTimeout(timeout);

      const requestId =
        response.headers.get("x-request-id") ??
        response.headers.get("x-amzn-requestid") ??
        undefined;

      if (response.ok) {
        const json = (await response.json().catch(() => undefined)) as
          | SuccessEnvelope<T>
          | T
          | undefined;
        if (json && typeof json === "object" && "success" in json) {
          const env = json as SuccessEnvelope<T>;
          return env.pagination
            ? { data: env.data, pagination: env.pagination }
            : { data: env.data };
        }
        return { data: json as T };
      }

      const payload = (await response.json().catch(() => undefined)) as
        | ErrorPayload
        | undefined;

      if (
        attempt < this.maxRetries &&
        shouldRetry(response.status, opts.method)
      ) {
        const wait =
          response.status === 429 && payload?.retryAfter
            ? payload.retryAfter * 1000
            : backoff(attempt);
        await sleep(wait);
        continue;
      }

      throw errorFromResponse(response.status, payload, requestId);
    }

    throw new NetworkError(
      `Request to ${opts.method} ${opts.path} failed after retries`,
      lastError,
    );
  }

  private buildUrl(
    path: string,
    query: RequestOptions["query"],
  ): string {
    const url = new URL(
      path.startsWith("/") ? path.slice(1) : path,
      `${this.baseUrl}/`,
    );
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }
}

function shouldRetry(status: number, method: string): boolean {
  if (status === 429) return true;
  if (status >= 500 && status < 600) {
    return method === "GET" || method === "DELETE";
  }
  return false;
}

function isRetryableNetworkError(err: unknown): boolean {
  if (err instanceof Error) {
    if (err.name === "AbortError") return false;
    return true;
  }
  return false;
}

function backoff(attempt: number): number {
  const jitter = Math.random() * 100;
  return RETRY_BASE_DELAY_MS * Math.pow(2, attempt) + jitter;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mergeSignals(
  user: AbortSignal | undefined,
  internal: AbortSignal,
): AbortSignal {
  if (!user) return internal;
  if (user.aborted) return user;
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  user.addEventListener("abort", onAbort, { once: true });
  internal.addEventListener("abort", onAbort, { once: true });
  return ctrl.signal;
}
