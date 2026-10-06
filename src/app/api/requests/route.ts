import { getFieldErrors, requestSchema } from "@/lib/request-schema";
import { persistRequest } from "@/lib/supabase";

export const runtime = "nodejs";
const MAX_BODY_BYTES = 16 * 1024;
const safeError = "Talebinizin kaydedildiğini doğrulayamadık. Lütfen biraz sonra tekrar deneyin.";

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  // Next can normalize request.url to localhost; Host preserves the browser-facing authority.
  const expectedOrigin = `${requestUrl.protocol}//${request.headers.get("host") ?? requestUrl.host}`;
  if (origin && origin !== expectedOrigin) {
    return json({ message: "Bu kaynaktan gelen istek kabul edilmiyor." }, 403);
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return json({ message: "İstek JSON biçiminde olmalıdır." }, 415);
  }

  let payload: unknown;
  try {
    // Count streamed bytes instead of trusting a caller's Content-Length header.
    const reader = request.body?.getReader();
    if (!reader) return json({ message: "İstek gövdesi boş olamaz." }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return json({ message: "İstek çok büyük. Açıklamayı kısaltın." }, 413);
      }
      chunks.push(value);
    }
    payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return json({ message: "İstek okunamadı. Lütfen formu tekrar gönderin." }, 400);
  }

  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return json({ message: "Lütfen formdaki alanları kontrol edin.", errors: getFieldErrors(parsed.error) }, 422);
  }

  try {
    const id = await persistRequest(parsed.data);
    return json({ id, message: "Talebiniz kaydedildi." }, 201);
  } catch {
    // Never log form contents, SDK errors, or credentials.
    console.error("[requests] Persistence unavailable or unconfirmed");
    return json({ message: safeError }, 503);
  }
}
