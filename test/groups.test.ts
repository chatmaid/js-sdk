import { describe, expect, it, vi } from "vitest";
import { Chatmaid } from "../src/index.js";

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

describe("groups.list", () => {
  it("gets /groups with fromPhoneId and unwraps data", async () => {
    const fetchImpl = mockFetch((req) => {
      const url = new URL(req.url);
      expect(req.method).toBe("GET");
      expect(url.pathname).toBe("/v1/groups");
      expect(url.searchParams.get("fromPhoneId")).toBe("+15550000000");
      expect(req.headers.get("authorization")).toBe("Bearer sk_test_xxx");
      return jsonResponse(200, {
        success: true,
        data: [
          {
            id: "120363043211234567@g.us",
            name: "Team Updates",
            isCommunityAnnounce: false,
          },
        ],
      });
    });

    const cm = new Chatmaid({ apiKey: "sk_test_xxx", fetch: fetchImpl });
    const groups = await cm.groups.list({ fromPhoneId: "+15550000000" });
    expect(groups).toHaveLength(1);
    expect(groups[0]?.id).toBe("120363043211234567@g.us");
    expect(groups[0]?.name).toBe("Team Updates");
  });

  it("requires fromPhoneId", async () => {
    const cm = new Chatmaid({ apiKey: "sk_test_xxx", fetch: mockFetch(() => jsonResponse(200, { success: true, data: [] })) });
    await expect(
      cm.groups.list({ fromPhoneId: "" }),
    ).rejects.toThrow(TypeError);
  });
});
