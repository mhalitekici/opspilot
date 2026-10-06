"use client";

import { useRef, useState, type FormEvent } from "react";
import { getFieldErrors, requestSchema, services, type FieldErrors, type ServiceRequest } from "@/lib/request-schema";
import { Icon } from "./icon";

type Status = "idle" | "submitting" | "success" | "error";
const failureMessage = "Talebinizin kaydedildiğini doğrulayamadık. Bilgileriniz formda duruyor; lütfen biraz sonra tekrar deneyin.";

export function RequestForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [descriptionLength, setDescriptionLength] = useState(0);
  const inFlight = useRef(false);
  const statusRef = useRef<HTMLDivElement>(null);

  function focusFirstError(form: HTMLFormElement, fieldErrors: FieldErrors) {
    // Wait for fieldset re-enabling and error descriptions to reach the DOM.
    requestAnimationFrame(() => {
      const field = Object.keys(fieldErrors)[0];
      const control = field ? form.elements.namedItem(field) : null;
      if (control instanceof HTMLElement) control.focus();
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = event.currentTarget;
    const parsed = requestSchema.safeParse(Object.fromEntries(new FormData(form)));
    setMessage("");
    if (!parsed.success) {
      const fieldErrors = getFieldErrors(parsed.error);
      setErrors(fieldErrors);
      setStatus("idle");
      focusFirstError(form, fieldErrors);
      return;
    }

    inFlight.current = true;
    setErrors({});
    setStatus("submitting");
    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (response.status === 422 && result.errors && typeof result.errors === "object") {
        // Accept only known fields and string messages from the endpoint.
        const fieldErrors: FieldErrors = {};
        for (const field of ["fullName", "email", "service", "description"] as const) {
          const values: unknown = result.errors[field];
          if (Array.isArray(values) && values.every((value) => typeof value === "string")) fieldErrors[field] = values;
        }
        setErrors(fieldErrors);
        setStatus("error");
        setMessage("Lütfen formdaki alanları kontrol edin.");
        focusFirstError(form, fieldErrors);
        return;
      }
      if (response.status !== 201 || typeof result.id !== "string" || !result.id) throw new Error("Unconfirmed submission");
      setStatus("success");
      form.reset();
      setDescriptionLength(0);
      // Focus after React renders the confirmation for keyboard and screen-reader users.
      requestAnimationFrame(() => statusRef.current?.focus());
    } catch {
      setStatus("error");
      setMessage(failureMessage);
    } finally {
      inFlight.current = false;
    }
  }

  function fieldProps(field: keyof ServiceRequest, hint?: string) {
    return {
      "aria-invalid": !!errors[field],
      "aria-describedby": [hint, errors[field] ? `${field}-error` : null].filter(Boolean).join(" ") || undefined,
    };
  }

  return (
    <div className="request-card">
      <div className="form-heading"><h3>Birlikte başlayalım.</h3><p>İhtiyacınızı paylaşın, ilk adımı birlikte netleştirelim.</p></div>
      <div ref={statusRef} tabIndex={-1} role="status" aria-live="polite" className={status === "success" ? "success-message" : "sr-only"}>
        {status === "success" && <><span className="success-icon"><Icon name="check" /></span><h3>Talebiniz kaydedildi.</h3><p>İhtiyacınızı bizimle paylaştığınız için teşekkürler.</p><p className="demo-note">Bu bir demo projedir. Talebiniz veritabanına kaydedilir; gerçek bir hizmet veya geri dönüş sunulmaz.</p><button className="button button-dark" type="button" onClick={() => { setStatus("idle"); requestAnimationFrame(() => document.getElementById("fullName")?.focus()); }}>Yeni talep oluştur <Icon name="arrow" /></button></>}
      </div>
      {status !== "success" && <form onSubmit={handleSubmit} noValidate aria-busy={status === "submitting"}>
        <fieldset disabled={status === "submitting"}>
          <legend className="sr-only">Hizmet talebi bilgileri</legend>
          <div className="form-row">
            <div className="field"><label htmlFor="fullName">Ad soyad <span aria-hidden="true">*</span></label><input id="fullName" name="fullName" autoComplete="name" placeholder="Adınız ve soyadınız" required maxLength={100} {...fieldProps("fullName")} />{errors.fullName && <p className="field-error" id="fullName-error">{errors.fullName[0]}</p>}</div>
            <div className="field"><label htmlFor="email">E-posta <span aria-hidden="true">*</span></label><input id="email" name="email" type="email" autoComplete="email" placeholder="siz@sirketiniz.com" required maxLength={254} {...fieldProps("email")} />{errors.email && <p className="field-error" id="email-error">{errors.email[0]}</p>}</div>
          </div>
          <div className="field"><label htmlFor="service">İlgilendiğiniz hizmet <span aria-hidden="true">*</span></label><select id="service" name="service" defaultValue="" required {...fieldProps("service")}><option value="" disabled>Bir hizmet seçin</option>{services.map((service) => <option key={service.value} value={service.value}>{service.label}</option>)}</select>{errors.service && <p className="field-error" id="service-error">{errors.service[0]}</p>}</div>
          <div className="field"><label htmlFor="description">Nasıl yardımcı olabiliriz? <span aria-hidden="true">*</span></label><textarea id="description" name="description" rows={5} required minLength={20} maxLength={2000} placeholder="Tekrarlayan işinizi, kullandığınız araçları ve neyi kolaylaştırmak istediğinizi anlatın…" onChange={(event) => setDescriptionLength(event.target.value.length)} {...fieldProps("description", "description-hint")} /><div className="field-hint" id="description-hint"><span>En az 20 karakter. Hassas bilgi paylaşmayın.</span><span>{descriptionLength}/2000</span></div>{errors.description && <p className="field-error" id="description-error">{errors.description[0]}</p>}</div>
          <p className="form-disclosure">Tüm alanlar zorunludur. Bu demo formuna girdiğiniz bilgiler saklanır. Lütfen test bilgileri kullanın.</p>
          <button className="button button-dark submit-button" type="submit" disabled={status === "submitting"}>{status === "submitting" ? <><span className="spinner" aria-hidden="true" /> Talebiniz gönderiliyor…</> : <>Talep gönder <Icon name="arrow" /></>}</button>
        </fieldset>
        <div aria-live="polite" role="status" className="sr-only">{status === "submitting" ? "Talebiniz gönderiliyor. Lütfen bekleyin." : ""}</div>
        {message && <p role="alert" className="form-error">{message}</p>}
      </form>}
    </div>
  );
}
