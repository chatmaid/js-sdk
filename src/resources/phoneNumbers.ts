import type { HttpClient } from "../http.js";
import type { PhoneNumber, PhoneNumberStatus } from "../types.js";

export class PhoneNumbersResource {
  constructor(private readonly http: HttpClient) {}

  async list(): Promise<PhoneNumber[]> {
    const { data } = await this.http.request<PhoneNumber[]>({
      method: "GET",
      path: "/phone-numbers",
    });
    return data;
  }

  async get(idOrE164: string): Promise<PhoneNumber> {
    if (!idOrE164)
      throw new TypeError("phoneNumbers.get: id or E.164 number is required");
    const { data } = await this.http.request<PhoneNumber>({
      method: "GET",
      path: `/phone-numbers/${encodeURIComponent(idOrE164)}`,
    });
    return data;
  }

  async status(idOrE164: string): Promise<PhoneNumberStatus> {
    if (!idOrE164)
      throw new TypeError(
        "phoneNumbers.status: id or E.164 number is required",
      );
    const { data } = await this.http.request<PhoneNumberStatus>({
      method: "GET",
      path: `/phone-numbers/${encodeURIComponent(idOrE164)}/status`,
    });
    return data;
  }
}
