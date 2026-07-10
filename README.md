# @chatmaid/sdk

Official JavaScript / TypeScript SDK for the [Chatmaid Developers API](https://developers.chatmaid.net).

Send WhatsApp messages, look up phone numbers and account usage, and verify webhooks — typed end-to-end. Works in Node ≥18, modern browsers, Cloudflare Workers, Vercel Edge, Deno, and Bun. Zero runtime dependencies.

## Install

```bash
npm install @chatmaid/sdk
# or
pnpm add @chatmaid/sdk
# or
yarn add @chatmaid/sdk
```

## Quickstart

```ts
import { Chatmaid } from "@chatmaid/sdk";

const cm = new Chatmaid({ apiKey: process.env.CHATMAID_API_KEY! });

const message = await cm.messages.send({
  fromPhoneId: "+15551234567",
  to: "+15555550123",
  content: "Hello from Chatmaid!",
});

console.log(message.id, message.status);
```

Use `sk_test_*` keys against the sandbox and `sk_live_*` keys against production. The environment is inferred from the key prefix — you don't pass it explicitly.

`fromPhoneId` accepts either the E.164 number you registered (recommended) or its dashboard ID.

## Sending to a group

```ts
const groups = await cm.groups.list({ fromPhoneId: "+15551234567" });

await cm.messages.send({
  fromPhoneId: "+15551234567",
  to: groups[0].id, // full group JID, e.g. "120363043211234567@g.us"
  content: "Team update: deploy completed.",
});
```

`groups.list()` returns the groups the sender phone can post to. Inbound group messages carry the same JID in `groupId`, so you can reply to a group straight from a webhook payload.

## Sending media

```ts
await cm.messages.send({
  fromPhoneId,
  to: "+15555550123",
  content: "Here is your receipt:",
  mediaUrls: ["https://example.com/receipts/123.pdf"],
});
```

`mediaUrls` must be HTTPS URLs. When `content` is provided alongside a single media URL, it becomes the caption.

## Reading messages

```ts
const message = await cm.messages.get("msg_abc123");

const page = await cm.messages.list({ status: "failed", limit: 50 });

for await (const m of cm.messages.iterate({ status: "sent" })) {
  // auto-paginates
}
```

## Inbound messages

Messages received by your connected phone numbers (live environment only):

```ts
const inbound = await cm.messages.getInbound("inmsg_abc123");

const page = await cm.messages.listInbound({ limit: 50 });

for await (const m of cm.messages.iterateInbound()) {
  // auto-paginates
}
```

For real-time delivery, subscribe to the `message.received` webhook event instead of polling.

## Phone numbers and account

```ts
await cm.phoneNumbers.list();
await cm.phoneNumbers.status("phone_abc123");
await cm.account.usage({ period: "month" });
```

## Verifying webhooks

```ts
import { verifyWebhook, WebhookVerificationError } from "@chatmaid/sdk";

// Express example — pass the raw request body, not parsed JSON.
app.post("/webhooks/chatmaid", express.raw({ type: "application/json" }), (req, res) => {
  try {
    const event = verifyWebhook({
      body: req.body,
      signature: req.header("x-chatmaid-signature"),
      secret: process.env.CHATMAID_WEBHOOK_SECRET!,
    });

    switch (event.event) {
      case "message.sent":
        // event.data: { messageId, from, to, status, ... }
        break;
      case "message.failed":
        // event.data includes errorCode, errorMessage
        break;
      case "message.received":
        // inbound message: event.data: { messageId, from, to, content, type, ... }
        break;
      case "message.delivered":
      case "message.read":
        // delivery receipts for messages you sent
        break;
      case "phone.connected":
      case "phone.disconnected":
        break;
    }

    res.status(200).end();
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      return res.status(400).end();
    }
    throw err;
  }
});
```

The verifier checks the HMAC-SHA256 signature, rejects timestamps outside a 5-minute tolerance window (configurable via `toleranceSeconds`), and returns a typed event union.

## Errors

Every failed call throws a typed error you can `instanceof`-check:

```ts
import { RateLimitError, ValidationError } from "@chatmaid/sdk";

try {
  await cm.messages.send({ ... });
} catch (err) {
  if (err instanceof RateLimitError) {
    await sleep(err.retryAfter! * 1000);
  } else if (err instanceof ValidationError) {
    console.error(err.details); // string[] of field errors
  } else {
    throw err;
  }
}
```

Available classes: `AuthenticationError`, `PermissionError`, `ValidationError`, `NotFoundError`, `RateLimitError`, `ServerError`, `NetworkError`. All extend `ChatmaidError` with `status`, `code`, `message`, `details`, `path`, `requestId`.

The SDK retries automatically on 429 (honoring `retryAfter`) and on 5xx for `GET`/`DELETE`. `POST` is never retried automatically — the SDK attaches an idempotency key so the server can dedup if you retry yourself.

## Idempotency

`messages.send` is idempotent by default — the SDK attaches a unique key per call so a transport retry won't duplicate a message. For app-level retry safety (job queues, cold starts, replays of your own code), pass a stable key derived from your domain:

```ts
await cm.messages.send({
  fromPhoneId,
  to,
  content,
  idempotencyKey: `order-${orderId}`,
});
```

## Configuration

```ts
new Chatmaid({
  apiKey: "sk_live_...",
  timeoutMs: 30_000,
  maxRetries: 2,
  fetch: customFetch, // pass your own fetch implementation if needed
  userAgent: "my-app/1.2.3",
});
```

## Documentation

Full reference, error catalog, and recipes: [developers.chatmaid.net](https://developers.chatmaid.net/docs).

## License

MIT
