import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { revokeTokenMock } = vi.hoisted(() => ({ revokeTokenMock: vi.fn() }));

vi.mock("@/lib/mcp/oauth/tokens", () => ({ revokeToken: revokeTokenMock }));

import { POST } from "@/app/api/oauth/revoke/route";

function buildFormRequest(fields: Record<string, string>): NextRequest {
  const params = new URLSearchParams(fields);
  return new NextRequest("http://localhost:3000/api/oauth/revoke", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
}

function buildJsonRequest(body: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost:3000/api/oauth/revoke", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/oauth/revoke", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 invalid_request when token is missing", async () => {
    const response = await POST(buildFormRequest({ client_id: "client-1" }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("invalid_request");
    expect(revokeTokenMock).not.toHaveBeenCalled();
  });

  it("always returns 200 for a form-urlencoded body, even for an unknown token", async () => {
    revokeTokenMock.mockResolvedValue(undefined);

    const response = await POST(buildFormRequest({ token: "hmrt_unknown", client_id: "client-1" }));

    expect(response.status).toBe(200);
    expect(revokeTokenMock).toHaveBeenCalledWith({ token: "hmrt_unknown", clientId: "client-1" });
  });

  it("accepts a JSON body", async () => {
    revokeTokenMock.mockResolvedValue(undefined);

    const response = await POST(buildJsonRequest({ token: "hmrt_known", client_id: "client-1" }));

    expect(response.status).toBe(200);
    expect(revokeTokenMock).toHaveBeenCalledWith({ token: "hmrt_known", clientId: "client-1" });
  });
});
