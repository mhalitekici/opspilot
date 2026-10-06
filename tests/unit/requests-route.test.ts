import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/lib/supabase", () => ({ persistRequest: vi.fn() }));
import { POST } from "../../src/app/api/requests/route";
import { persistRequest } from "../../src/lib/supabase";

const valid = { fullName: "Deniz Yılmaz", email: "deniz@example.com", service: "workflow", description: "Haftalık raporları otomatik hazırlamak istiyoruz." };
const persist = vi.mocked(persistRequest);
const makeRequest = (body: unknown, headers: Record<string, string> = {}) => new Request("http://localhost:3000/api/requests", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });

beforeEach(() => { persist.mockReset(); });

describe("POST /api/requests", () => {
  it("waits for persistence and returns a receipt only after it resolves", async () => {
    let resolve!: (id: string) => void;
    persist.mockReturnValue(new Promise<string>((done) => { resolve = done; }));
    let finished = false;
    const pending = POST(makeRequest({ ...valid, email: " DENIZ@EXAMPLE.COM " })).then((response) => { finished = true; return response; });
    await vi.waitFor(() => expect(persist).toHaveBeenCalledWith(valid));
    expect(finished).toBe(false);
    resolve("stored-id");
    const response = await pending;
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "stored-id", message: "Talebiniz kaydedildi." });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects invalid input before touching the database", async () => {
    const response = await POST(makeRequest({ ...valid, email: "bad", service: "other" }));
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ errors: { email: expect.any(Array), service: expect.any(Array) } });
    expect(persist).not.toHaveBeenCalled();
  });

  it("returns a safe non-2xx response when the database fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    persist.mockRejectedValue(new Error("secret credential and internal stack trace"));
    const response = await POST(makeRequest(valid));
    expect(response.status).toBe(503);
    const body = await response.text();
    expect(body).not.toContain("secret credential");
    expect(body).not.toContain('"id"');
    expect(log).toHaveBeenCalledWith("[requests] Persistence unavailable or unconfirmed");
    log.mockRestore();
  });

  it("rejects malformed JSON", async () => {
    const response = await POST(new Request("http://localhost:3000/api/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }));
    expect(response.status).toBe(400);
    expect(persist).not.toHaveBeenCalled();
  });

  it("rejects oversized bodies without trusting Content-Length", async () => {
    const response = await POST(makeRequest({ description: "x".repeat(17000) }, { "Content-Length": "10" }));
    expect(response.status).toBe(413);
    expect(persist).not.toHaveBeenCalled();
  });

  it("rejects unsupported content types", async () => {
    expect((await POST(makeRequest(valid, { "Content-Type": "text/plain" }))).status).toBe(415);
    expect(persist).not.toHaveBeenCalled();
  });

  it("rejects cross-origin browser requests", async () => {
    expect((await POST(makeRequest(valid, { Origin: "https://other.example" }))).status).toBe(403);
    expect(persist).not.toHaveBeenCalled();
  });

  it("accepts a matching public Host when Next normalizes the internal URL", async () => {
    persist.mockResolvedValue("stored-id");
    const response = await POST(makeRequest(valid, { Host: "127.0.0.1:3000", Origin: "http://127.0.0.1:3000" }));
    expect(response.status).toBe(201);
    expect(persist).toHaveBeenCalledWith(valid);
  });
});
