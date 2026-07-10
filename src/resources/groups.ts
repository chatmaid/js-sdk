import type { HttpClient } from "../http.js";
import type { Group, ListGroupsParams } from "../types.js";

export class GroupsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List the WhatsApp groups the given sender phone can post to.
   * Each group's `id` is a full group JID — pass it as `to` in
   * `messages.send()` to message that group.
   */
  async list(params: ListGroupsParams): Promise<Group[]> {
    if (!params?.fromPhoneId) {
      throw new TypeError("groups.list: fromPhoneId is required");
    }
    const { data } = await this.http.request<Group[]>({
      method: "GET",
      path: "/groups",
      query: { fromPhoneId: params.fromPhoneId },
    });
    return data;
  }
}
