import { z } from "zod";

export const services = [
  { value: "workflow", label: "İş Akışı Otomasyonu" },
  { value: "ai", label: "AI Destekli Otomasyon" },
  { value: "integration", label: "Veri Entegrasyonu" },
  { value: "custom", label: "Özel Çözüm" },
] as const;

export const requestSchema = z.object({
  fullName: z.string().trim().min(2, "Adınızı ve soyadınızı en az 2 karakterle yazın.").max(100, "Ad ve soyad en fazla 100 karakter olabilir."),
  email: z.string().trim().toLowerCase().max(254, "E-posta en fazla 254 karakter olabilir.").pipe(z.email("Geçerli bir e-posta adresi yazın.")),
  service: z.enum(["workflow", "ai", "integration", "custom"], { error: "Lütfen bir hizmet seçin." }),
  description: z.string().trim().min(20, "İhtiyacınızı en az 20 karakterle anlatın.").max(2000, "Açıklama en fazla 2000 karakter olabilir."),
});

export type ServiceRequest = z.infer<typeof requestSchema>;
export type FieldErrors = Partial<Record<keyof ServiceRequest, string[]>>;

export function getFieldErrors(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors;
}
