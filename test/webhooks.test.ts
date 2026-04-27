import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  verifyWebhook,
  WebhookVerificationError,
} from "../src/index.js";

const SECRET = "whsec_test_secret";

function sign(body: string, timestamp: number, secret = SECRET): string {
  const sig = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  return `t=${timestamp},v1=${sig}`;
}

describe("verifyWebhook", () => {
  it("accepts a valid signature and returns the typed event", () => {
    const now = 1_700_000_000;
    const body = JSON.stringify({
      event: "message.sent",
      timestamp: new Date(now * 1000).toISOString(),
      data: {
        id: "msg_1",
        from: "+1",
        to: "+2",
        content: "hi",
        mediaUrls: [],
        status: "sent",
      },
    });
    const event = verifyWebhook({
      body,
      signature: sign(body, now),
      secret: SECRET,
      now: () => now * 1000,
    });
    expect(event.event).toBe("message.sent");
    if (event.event === "message.sent") {
      expect(event.data.id).toBe("msg_1");
    }
  });

  it("rejects a tampered body", () => {
    const now = 1_700_000_000;
    const body = JSON.stringify({
      event: "message.sent",
      timestamp: "x",
      data: { id: "a", from: "+1", to: "+2", content: null, mediaUrls: [], status: "sent" },
    });
    const tampered = body.replace('"id":"a"', '"id":"b"');
    expect(() =>
      verifyWebhook({
        body: tampered,
        signature: sign(body, now),
        secret: SECRET,
        now: () => now * 1000,
      }),
    ).toThrow(WebhookVerificationError);
  });

  it("rejects an out-of-tolerance timestamp", () => {
    const signedAt = 1_700_000_000;
    const body = JSON.stringify({
      event: "phone.connected",
      timestamp: "x",
      data: { id: "p_1", phoneNumber: "+1", status: "connected" },
    });
    expect(() =>
      verifyWebhook({
        body,
        signature: sign(body, signedAt),
        secret: SECRET,
        toleranceSeconds: 60,
        now: () => (signedAt + 3600) * 1000,
      }),
    ).toThrow(/tolerance/);
  });

  it("rejects a malformed signature header", () => {
    expect(() =>
      verifyWebhook({
        body: "{}",
        signature: "garbage",
        secret: SECRET,
      }),
    ).toThrow(/Malformed signature/);
  });

  it("rejects a missing signature", () => {
    expect(() =>
      verifyWebhook({
        body: "{}",
        signature: undefined,
        secret: SECRET,
      }),
    ).toThrow(/Missing/);
  });
});
