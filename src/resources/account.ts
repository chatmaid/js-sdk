import type { HttpClient } from "../http.js";
import type { Account, Usage, UsagePeriod } from "../types.js";

export class AccountResource {
  constructor(private readonly http: HttpClient) {}

  async get(): Promise<Account> {
    const { data } = await this.http.request<Account>({
      method: "GET",
      path: "/account",
    });
    return data;
  }

  async usage(params: { period?: UsagePeriod } = {}): Promise<Usage> {
    const { data } = await this.http.request<Usage>({
      method: "GET",
      path: "/account/usage",
      query: { period: params.period },
    });
    return data;
  }
}
