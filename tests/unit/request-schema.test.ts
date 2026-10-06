import { describe, expect, it } from "vitest";
import { requestSchema } from "../../src/lib/request-schema";

export const validRequest = {
  fullName: "Deniz Yılmaz",
  email: "deniz@example.com",
  service: "workflow",
  description: "Haftalık raporları otomatik hazırlamak istiyoruz.",
};

describe("shared request validation", () => {
  it("accepts a valid request and normalizes surrounding whitespace and email case", () => {
    const result = requestSchema.parse({ ...validRequest, fullName: "  Deniz Yılmaz  ", email: " DENIZ@EXAMPLE.COM ", description: `  ${validRequest.description}  ` });
    expect(result).toEqual(validRequest);
  });

  it.each([
    ["empty name", { fullName: "   " }],
    ["missing name", { fullName: undefined }],
    ["long name", { fullName: "a".repeat(101) }],
    ["invalid email", { email: "not-an-email" }],
    ["long email", { email: `${"a".repeat(250)}@example.com` }],
    ["invalid service", { service: "unlisted-service" }],
    ["empty description", { description: "" }],
    ["short description", { description: "Kısa" }],
    ["long description", { description: "a".repeat(2001) }],
    ["incorrect type", { fullName: 123 }],
  ])("rejects %s", (_, changes) => {
    expect(requestSchema.safeParse({ ...validRequest, ...changes }).success).toBe(false);
  });

  it("strips unrecognized fields before persistence", () => {
    expect(requestSchema.parse({ ...validRequest, id: "caller-controlled", created_at: "yesterday" })).toEqual(validRequest);
  });
});
