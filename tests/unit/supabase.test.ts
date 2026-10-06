import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));
import { createClient } from "@supabase/supabase-js";
import { persistRequest } from "../../src/lib/supabase";

const input = { fullName: "Deniz Yılmaz", email: "deniz@example.com", service: "workflow" as const, description: "Haftalık raporları otomatik hazırlamak istiyoruz." };

function mockDatabase(result: unknown) {
  vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-placeholder");
  const chain = { from: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), abortSignal: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue(result) };
  vi.mocked(createClient).mockReturnValue(chain as unknown as ReturnType<typeof createClient>);
  return chain;
}

afterEach(() => vi.unstubAllEnvs());

describe("Supabase persistence", () => {
  it("maps fields to database columns and requires an insert receipt", async () => {
    const db = mockDatabase({ data: { id: "persisted-id" }, error: null });
    await expect(persistRequest(input)).resolves.toBe("persisted-id");
    expect(db.from).toHaveBeenCalledWith("service_requests");
    expect(db.insert).toHaveBeenCalledWith({ full_name: input.fullName, email: input.email, service: input.service, description: input.description });
    expect(db.select).toHaveBeenCalledWith("id");
    expect(db.abortSignal).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it.each([
    { data: null, error: { message: "internal details" } },
    { data: null, error: null },
    { data: { id: "" }, error: null },
  ])("rejects failed or unconfirmed writes: %j", async (result) => {
    mockDatabase(result);
    await expect(persistRequest(input)).rejects.toThrow("Database insert not confirmed");
  });

  it("fails safely when credentials are missing", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    await expect(persistRequest(input)).rejects.toThrow("Database configuration unavailable");
    expect(createClient).not.toHaveBeenCalled();
  });
});
