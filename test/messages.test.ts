import { describe, expect, it, vi } from "vitest";
import { Chatmaid, RateLimitError, ValidationError } from "../src/index.js";

function mockFetch(handler: (req: Request) => Response | Promise<Response>) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input as string, init);
    return handler(req);
  });
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("messages.send", () => {
  it("posts to /messages/send with bearer auth and unwraps data", async () => {
    const fetchImpl = mockFetch(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/messages/send");
      expect(req.headers.get("authorization")).toBe("Bearer sk_test_xxx");
      const body = await req.json();
      expect(body).toMatchObject({
        fromPhoneId: "phone_1",
        to: "+15555555555",
        content: "hi",
      });
      expect(typeof body.idempotencyKey).toBe("string");
      expect(body.idempotencyKey.length).toBeGreaterThan(0);
      return jsonResponse(200, {
        success: true,
        data: {
          id: "msg_1",
          from: "+15550000000",
          to: "+15555555555",
          content: "hi",
          mediaUrls: [],
          status: "sent",
          errorCode: null,
          errorMessage: null,
          createdAt: "2026-04-27T00:00:00.000Z",
          sentAt: "2026-04-27T00:00:01.000Z",
          failedAt: null,
        },
      });
    });

    const cm = new Chatmaid({ apiKey: "sk_test_xxx", fetch: fetchImpl });
    const msg = await cm.messages.send({
      fromPhoneId: "phone_1",
      to: "+15555555555",
      content: "hi",
    });
    expect(msg.id).toBe("msg_1");
    expect(msg.status).toBe("sent");
    expect(cm.environment).toBe("test");
  });

  it("preserves a caller-supplied idempotencyKey", async () => {
    let captured: any;
    const fetchImpl = mockFetch(async (req) => {
      captured = await req.json();
      return jsonResponse(200, {
        success: true,
        data: {
          id: "msg_1",
          from: "+1",
          to: "+2",
          content: "x",
          mediaUrls: [],
          status: "sent",
          errorCode: null,
          errorMessage: null,
          createdAt: "2026-04-27T00:00:00.000Z",
          sentAt: null,
          failedAt: null,
        },
      });
    });
    const cm = new Chatmaid({ apiKey: "sk_test_xxx", fetch: fetchImpl });
    await cm.messages.send({
      fromPhoneId: "p",
      to: "+1",
      content: "x",
      idempotencyKey: "order-42",
    });
    expect(captured.idempotencyKey).toBe("order-42");
  });

  it("requires content or mediaUrls", async () => {
    const cm = new Chatmaid({ apiKey: "sk_test_xxx", fetch: mockFetch(() => new Response()) });
    await expect(
      cm.messages.send({ fromPhoneId: "p", to: "+1" }),
    ).rejects.toThrow(/content or mediaUrls/);
  });

  it("maps 400 to ValidationError with details", async () => {
    const fetchImpl = mockFetch(() =>
      jsonResponse(400, {
        success: false,
        error: "BadRequest",
        message: ["to must be in E.164 format"],
        statusCode: 400,
        timestamp: "2026-04-27T00:00:00.000Z",
        path: "/v1/messages/send",
      }),
    );
    const cm = new Chatmaid({
      apiKey: "sk_test_xxx",
      fetch: fetchImpl,
      maxRetries: 0,
    });
    await expect(
      cm.messages.send({
        fromPhoneId: "p",
        to: "bad",
        content: "x",
      }),
    ).rejects.toMatchObject({
      name: "ValidationError",
      status: 400,
      details: ["to must be in E.164 format"],
    });
  });

  it("maps 429 to RateLimitError with retryAfter", async () => {
    const fetchImpl = mockFetch(() =>
      jsonResponse(429, {
        success: false,
        error: "Rate limit exceeded",
        retryAfter: 30,
      }),
    );
    const cm = new Chatmaid({
      apiKey: "sk_test_xxx",
      fetch: fetchImpl,
      maxRetries: 0,
    });
    let caught: unknown;
    try {
      await cm.messages.get("msg_1");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(RateLimitError);
    expect((caught as RateLimitError).retryAfter).toBe(30);
  });
});

describe("client", () => {
  it("infers live environment from sk_live key", () => {
    const cm = new Chatmaid({
      apiKey: "sk_live_abc",
      fetch: mockFetch(() => new Response()),
    });
    expect(cm.environment).toBe("live");
  });

  it("requires an apiKey", () => {
    expect(
      () =>
        new Chatmaid({ apiKey: "", fetch: mockFetch(() => new Response()) }),
    ).toThrow(/apiKey/);
  });
});

// Exhaustively touch the imports the linter cares about
void ValidationError;
