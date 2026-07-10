import { HttpClient, type HttpOptions } from "./http.js";
import { MessagesResource } from "./resources/messages.js";
import { PhoneNumbersResource } from "./resources/phoneNumbers.js";
import { GroupsResource } from "./resources/groups.js";
import { AccountResource } from "./resources/account.js";
import type { Environment } from "./types.js";

export interface ChatmaidOptions
  extends Omit<HttpOptions, "baseUrl"> {
  baseUrl?: string;
}

const DEFAULT_BASE_URL = "https://developers-api.chatmaid.net/v1";

export class Chatmaid {
  readonly messages: MessagesResource;
  readonly phoneNumbers: PhoneNumbersResource;
  readonly groups: GroupsResource;
  readonly account: AccountResource;
  readonly environment: Environment;

  constructor(opts: ChatmaidOptions) {
    const http = new HttpClient({
      ...opts,
      baseUrl: opts.baseUrl ?? DEFAULT_BASE_URL,
    });
    this.messages = new MessagesResource(http);
    this.phoneNumbers = new PhoneNumbersResource(http);
    this.groups = new GroupsResource(http);
    this.account = new AccountResource(http);
    this.environment = inferEnvironment(opts.apiKey);
  }
}

function inferEnvironment(apiKey: string): Environment {
  if (apiKey.startsWith("sk_live_")) return "live";
  return "test";
}
