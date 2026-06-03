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
        messageId: "msg_1",
        from: "+1",
        to: "+2",
        status: "sent",
        sentAt: new Date(now * 1000).toISOString(),
        deliveredAt: null,
        readAt: null,
        failedAt: null,
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
      expect(event.data.messageId).toBe("msg_1");
    }
  });

  it("accepts a message.received event", () => {
    const now = 1_700_000_000;
    const body = JSON.stringify({
      event: "message.received",
      timestamp: new Date(now * 1000).toISOString(),
      data: {
        messageId: "inmsg_1",
        from: "+2",
        to: "+1",
        content: "hello",
        type: "text",
        isGroup: false,
        groupId: null,
        receivedAt: new Date(now * 1000).toISOString(),
      },
    });
    const event = verifyWebhook({
      body,
      signature: sign(body, now),
      secret: SECRET,
      now: () => now * 1000,
    });
    expect(event.event).toBe("message.received");
    if (event.event === "message.received") {
      expect(event.data.content).toBe("hello");
      expect(event.data.type).toBe("text");
    }
  });

  it("accepts message.delivered and message.read events", () => {
    const now = 1_700_000_000;
    for (const eventType of ["message.delivered", "message.read"] as const) {
      const body = JSON.stringify({
        event: eventType,
        timestamp: new Date(now * 1000).toISOString(),
        data: {
          messageId: "msg_1",
          from: "+1",
          to: "+2",
          status: eventType === "message.read" ? "read" : "delivered",
          sentAt: new Date(now * 1000).toISOString(),
          deliveredAt: new Date(now * 1000).toISOString(),
          readAt: eventType === "message.read" ? new Date(now * 1000).toISOString() : null,
          failedAt: null,
        },
      });
      const event = verifyWebhook({
        body,
        signature: sign(body, now),
        secret: SECRET,
        now: () => now * 1000,
      });
      expect(event.event).toBe(eventType);
    }
  });

  it("rejects a tampered body", () => {
    const now = 1_700_000_000;
    const body = JSON.stringify({
      event: "message.sent",
      timestamp: "x",
      data: { messageId: "a", from: "+1", to: "+2", status: "sent" },
    });
    const tampered = body.replace('"messageId":"a"', '"messageId":"b"');
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
