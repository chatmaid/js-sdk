export type Environment = "live" | "test";

export type MessageStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export interface Message {
  id: string;
  from: string;
  to: string;
  content: string | null;
  mediaUrls: string[];
  status: MessageStatus;
  errorCode: string | null;
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
  to: string;
  content?: string;
  mediaUrls?: string[];
  idempotencyKey?: string;
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
  status: MessageStatus;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
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
  | WebhookEventBase<"message.failed", MessageEventData>
  | WebhookEventBase<"message.received", InboundMessageEventData>
  | WebhookEventBase<"message.delivered", MessageEventData>
  | WebhookEventBase<"message.read", MessageEventData>
  | WebhookEventBase<"phone.connected", PhoneEventData>
  | WebhookEventBase<"phone.disconnected", PhoneEventData>;
