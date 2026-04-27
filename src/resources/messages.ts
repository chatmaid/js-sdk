import type { HttpClient } from "../http.js";
import type {
  ListMessagesParams,
  Message,
  PaginatedMessages,
  SendMessageParams,
} from "../types.js";

function generateIdempotencyKey(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  // Fallback for environments without WebCrypto (very old Node only).
  return `cm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export class MessagesResource {
  constructor(private readonly http: HttpClient) {}

  async send(params: SendMessageParams): Promise<Message> {
    if (!params.fromPhoneId) {
      throw new TypeError("messages.send: fromPhoneId is required");
    }
    if (!params.to) {
      throw new TypeError("messages.send: to is required");
    }
    const hasContent = !!params.content && params.content.length > 0;
    const hasMedia = !!params.mediaUrls && params.mediaUrls.length > 0;
    if (!hasContent && !hasMedia) {
      throw new TypeError(
        "messages.send: provide either content or mediaUrls",
      );
    }
    const body: Record<string, unknown> = {
      fromPhoneId: params.fromPhoneId,
      to: params.to,
      idempotencyKey: params.idempotencyKey ?? generateIdempotencyKey(),
    };
    if (params.content !== undefined) body.content = params.content;
    if (params.mediaUrls !== undefined) body.mediaUrls = params.mediaUrls;

    const { data } = await this.http.request<Message>({
      method: "POST",
      path: "/messages/send",
      body,
    });
    return data;
  }

  async get(messageId: string): Promise<Message> {
    if (!messageId) throw new TypeError("messages.get: messageId is required");
    const { data } = await this.http.request<Message>({
      method: "GET",
      path: `/messages/${encodeURIComponent(messageId)}`,
    });
    return data;
  }

  async list(params: ListMessagesParams = {}): Promise<PaginatedMessages> {
    // Backend wraps paginated payloads as { success, data: { data, pagination } }
    // so the inner `data` arrives here as the unwrapped envelope body.
    const { data: payload } = await this.http.request<{
      data: Message[];
      pagination: PaginatedMessages["pagination"];
    }>({
      method: "GET",
      path: "/messages",
      query: {
        phoneNumberId: params.phoneNumberId,
        status: params.status,
        page: params.page,
        limit: params.limit,
      },
    });
    return {
      data: payload.data,
      pagination: payload.pagination ?? {
        page: params.page ?? 1,
        limit: params.limit ?? payload.data.length,
        total: payload.data.length,
        totalPages: 1,
      },
    };
  }

  async *iterate(
    params: Omit<ListMessagesParams, "page"> = {},
  ): AsyncIterableIterator<Message> {
    let page = 1;
    const limit = params.limit ?? 50;
    while (true) {
      const result = await this.list({ ...params, page, limit });
      for (const message of result.data) yield message;
      if (page >= result.pagination.totalPages) return;
      page += 1;
    }
  }
}
