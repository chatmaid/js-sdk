export type Environment = "live" | "test";

export type MessageStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

/**
 * Stable error codes returned on a failed message (in `errorCode`).
 * Present when `status` is `"failed"`.
 */
export type MessageErrorCode =
  | "NOT_CONNECTED"
  | "INVALID_RECIPIENT"
  | "RECIPIENT_NOT_REACHABLE"
  | "NOT_GROUP_MEMBER"
  | "RATE_LIMITED"
  | "NOT_AUTHORIZED"
  | "MEDIA_ERROR"
  | "TIMEOUT"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR";

export interface Message {
  id: string;
  from: string;
  to: string;
  /** True when the recipient is a WhatsApp group. */
  isGroup: boolean;
  /** Full group JID (…@g.us) when isGroup is true. */
  groupId: string | null;
  content: string | null;
  mediaUrls: string[];
  status: MessageStatus;
  errorCode: MessageErrorCode | null;
  errorMessage: string | null;
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
  environment?: Environment;
}

export type InboundMessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "sticker"
  | "location"
  | "contact"
  | "other";

export interface InboundMessage {
  id: string;
  from: string;
  to: string;
  content: string | null;
  type: InboundMessageType;
  isGroup: boolean;
  groupId: string | null;
  receivedAt: string;
  createdAt: string;
}

export interface SendMessageParams {
  fromPhoneId: string;
  /**
   * Recipient: an E.164 phone number (e.g. "+1987654321") or a WhatsApp
   * group JID (e.g. "120363043211234567@g.us") as returned by
   * `groups.list()` or by the `groupId` of an inbound group message.
   */
  to: string;
  content?: string;
  mediaUrls?: string[];
  idempotencyKey?: string;
}

export interface Group {
  /** Full group JID (…@g.us) — pass as `to` in messages.send(). */
  id: string;
  name: string;
  /** True for a community's announcement channel. */
  isCommunityAnnounce: boolean;
}

export interface ListGroupsParams {
  /** Sender phone (E.164 number or dashboard ID) whose groups to list. */
  fromPhoneId: string;
}

export interface ListMessagesParams {
  phoneNumberId?: string;
  status?: MessageStatus;
  page?: number;
  limit?: number;
}

export interface ListInboundMessagesParams {
  phoneNumberId?: string;
  page?: number;
  limit?: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedMessages {
  data: Message[];
  pagination: Pagination;
}

export interface PaginatedInboundMessages {
  data: InboundMessage[];
  pagination: Pagination;
}

export type PhoneConnectionStatus =
  | "connected"
  | "disconnected"
  | "connecting"
  | "qr_pending"
  | "error";

export interface PhoneNumber {
  id: string;
  phoneNumber: string;
  displayName: string | null;
  connectionStatus: PhoneConnectionStatus;
  environment: Environment;
  createdAt: string;
  lastConnectedAt: string | null;
}

export interface PhoneNumberStatus {
  id: string;
  phoneNumber: string;
  connectionStatus: PhoneConnectionStatus;
  lastConnectedAt: string | null;
  lastDisconnectedAt: string | null;
  updatedAt: string;
}

export interface Account {
  email: string;
  name: string | null;
  environment: Environment;
  subscriptionStatus: string | null;
  phoneNumbersCount: number;
  messagesCount: number;
  createdAt: string;
}

export type UsagePeriod = "day" | "week" | "month";

export interface Usage {
  period: UsagePeriod;
  startDate: string;
  endDate: string;
  messages: {
    total: number;
    pending: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };
  apiRequests: {
    total: number;
    successful: number;
    failed: number;
  };
}

export type WebhookEventType =
  | "message.sent"
  | "message.outgoing"
  | "message.failed"
  | "message.received"
  | "message.delivered"
  | "message.read"
  | "phone.connected"
  | "phone.disconnected";

interface WebhookEventBase<T extends WebhookEventType, D> {
  event: T;
  timestamp: string;
  data: D;
}

export interface MessageEventData {
  messageId: string;
  from: string;
  to: string;
  isGroup: boolean;
  groupId: string | null;
  status: MessageStatus;
  /** Always "api": these events describe messages issued through the API. */
  source: "api";
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
  errorCode?: MessageErrorCode | null;
  errorMessage?: string | null;
}

/**
 * A message sent from the connected phone itself rather than through the
 * API — i.e. typed by a human into WhatsApp. Carries no messageId because
 * there is no API send to reference.
 */
export interface OutgoingMessageEventData {
  from: string;
  to: string;
  content: string | null;
  type: InboundMessageType;
  isGroup: boolean;
  groupId: string | null;
  source: "manual";
  sentAt: string;
}

export interface InboundMessageEventData {
  messageId: string;
  from: string;
  to: string;
  content: string | null;
  type: InboundMessageType;
  isGroup: boolean;
  groupId: string | null;
  receivedAt: string;
}

export interface PhoneEventData {
  phoneId: string;
  phoneNumber: string;
  displayName: string | null;
  status: PhoneConnectionStatus;
  lastConnectedAt: string | null;
  lastDisconnectedAt: string | null;
}

export type WebhookEvent =
  | WebhookEventBase<"message.sent", MessageEventData>
  | WebhookEventBase<"message.outgoing", OutgoingMessageEventData>
  | WebhookEventBase<"message.failed", MessageEventData>
  | WebhookEventBase<"message.received", InboundMessageEventData>
  | WebhookEventBase<"message.delivered", MessageEventData>
  | WebhookEventBase<"message.read", MessageEventData>
  | WebhookEventBase<"phone.connected", PhoneEventData>
  | WebhookEventBase<"phone.disconnected", PhoneEventData>;
