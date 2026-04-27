export type Environment = "live" | "test";

export type MessageStatus = "pending" | "sent" | "failed";

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
  failedAt: string | null;
  environment?: Environment;
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
  status?: "pending" | "sent" | "failed";
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
  | "phone.connected"
  | "phone.disconnected";

interface WebhookEventBase<T extends WebhookEventType, D> {
  event: T;
  timestamp: string;
  data: D;
}

export interface MessageEventData {
  id: string;
  from: string;
  to: string;
  content: string | null;
  mediaUrls: string[];
  status: MessageStatus;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export interface PhoneEventData {
  id: string;
  phoneNumber: string;
  connectionStatus: PhoneConnectionStatus;
}

export type WebhookEvent =
  | WebhookEventBase<"message.sent", MessageEventData>
  | WebhookEventBase<"message.failed", MessageEventData>
  | WebhookEventBase<"phone.connected", PhoneEventData>
  | WebhookEventBase<"phone.disconnected", PhoneEventData>;
