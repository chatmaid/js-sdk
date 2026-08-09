import { createHmac, timingSafeEqual } from "node:crypto";
import type { WebhookEvent } from "./types.js";

export const SIGNATURE_HEADER = "X-Chatmaid-Signature";
export const EVENT_HEADER = "X-Chatmaid-Event";

const DEFAULT_TOLERANCE_SECONDS = 5 * 60;

export class WebhookVerificationError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "WebhookVerificationError";
    this.code = code;
  }
}

export interface VerifyWebhookOptions {
  body: string | Buffer | Uint8Array;
  signature: string | null | undefined;
  secret: string;
  toleranceSeconds?: number;
  now?: () => number;
}

export function verifyWebhook(opts: VerifyWebhookOptions): WebhookEvent {
  if (!opts.signature) {
    throw new WebhookVerificationError(
      "missing_signature",
      `Missing ${SIGNATURE_HEADER} header`,
    );
  }
  if (!opts.secret) {
    throw new WebhookVerificationError(
      "missing_secret",
      "Webhook secret is required",
    );
  }

  const parsed = parseSignatureHeader(opts.signature);
  const timestamp = parsed.timestamp;
  const provided = parsed.signature;

  const tolerance = opts.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  const nowSeconds = Math.floor((opts.now?.() ?? Date.now()) / 1000);
  if (Math.abs(nowSeconds - timestamp) > tolerance) {
    throw new WebhookVerificationError(
      "timestamp_out_of_tolerance",
      `Webhook timestamp is outside tolerance window of ${tolerance}s`,
    );
  }

  const rawBody = toBuffer(opts.body);
  const signedPayload = Buffer.concat([
    Buffer.from(`${timestamp}.`, "utf8"),
    rawBody,
  ]);
  const expected = createHmac("sha256", opts.secret)
    .update(signedPayload)
    .digest("hex");

  if (!safeEqualHex(expected, provided)) {
    throw new WebhookVerificationError(
      "signature_mismatch",
      "Webhook signature does not match",
    );
  }

  let event: unknown;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch (cause) {
    throw new WebhookVerificationError(
      "invalid_json",
      "Webhook body is not valid JSON",
    );
  }
  if (!isWebhookEvent(event)) {
    throw new WebhookVerificationError(
      "unknown_event",
      "Webhook payload is not a recognized Chatmaid event",
    );
  }
  return event;
}

function parseSignatureHeader(header: string): {
  timestamp: number;
  signature: string;
} {
  const parts = header.split(",").map((s) => s.trim());
  let timestamp: number | undefined;
  let signature: string | undefined;
  for (const part of parts) {
    const [key, value] = part.split("=", 2);
    if (key === "t" && value) timestamp = Number.parseInt(value, 10);
    else if (key === "v1" && value) signature = value;
  }
  if (!timestamp || Number.isNaN(timestamp) || !signature) {
    throw new WebhookVerificationError(
      "malformed_signature",
      `Malformed signature header: expected "t=<unix>,v1=<hex>"`,
    );
  }
  return { timestamp, signature };
}

function toBuffer(body: string | Buffer | Uint8Array): Buffer {
  if (Buffer.isBuffer(body)) return body;
  if (typeof body === "string") return Buffer.from(body, "utf8");
  return Buffer.from(body);
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

function isWebhookEvent(value: unknown): value is WebhookEvent {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.event !== "string") return false;
  if (typeof v.timestamp !== "string") return false;
  if (typeof v.data !== "object" || v.data === null) return false;
  return (
    v.event === "message.sent" ||
    v.event === "message.outgoing" ||
    v.event === "message.failed" ||
    v.event === "message.received" ||
    v.event === "message.delivered" ||
    v.event === "message.read" ||
    v.event === "phone.connected" ||
    v.event === "phone.disconnected"
  );
}
