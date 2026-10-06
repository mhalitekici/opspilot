import { expect, test, type Page } from "@playwright/test";

async function fillForm(page: Page) {
  await page.getByLabel("Ad soyad").fill("Deniz Yılmaz");
  await page.getByLabel("E-posta").fill("deniz@example.com");
  await page.getByLabel("İlgilendiğiniz hizmet").selectOption("workflow");
  await page.getByLabel("Nasıl yardımcı olabiliriz?").fill("Haftalık raporları otomatik hazırlamak istiyoruz.");
}

test("client validation prevents submission and focuses the first invalid field", async ({ page }) => {
  let requests = 0;
  page.on("request", (request) => { if (request.url().includes("/api/requests")) requests++; });
  await page.goto("/");
  await page.getByRole("button", { name: "Talep gönder" }).click();
  await expect(page.getByLabel("Ad soyad")).toBeFocused();
  await expect(page.getByText("Geçerli bir e-posta adresi yazın.")).toBeVisible();
  expect(requests).toBe(0);
});

test("shows loading and never success before the server confirms persistence", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/requests", async (route) => {
    await gate;
    await route.fulfill({ status: 201, json: { id: "mock-receipt" } });
  });
  await page.goto("/");
  await fillForm(page);
  await page.getByRole("button", { name: "Talep gönder" }).click();
  await expect(page.getByRole("button", { name: "Talebiniz gönderiliyor…" })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Talebiniz kaydedildi." })).not.toBeVisible();
  release();
  await expect(page.getByRole("heading", { name: "Talebiniz kaydedildi." })).toBeVisible();
  await page.getByRole("button", { name: "Yeni talep oluştur" }).click();
  await expect(page.getByLabel("Ad soyad")).toHaveValue("");
  await expect(page.getByLabel("Ad soyad")).toBeFocused();
});

test("a real endpoint configuration failure preserves input and never shows success", async ({ page }) => {
  await page.goto("/");
  await fillForm(page);
  const response = page.waitForResponse("**/api/requests");
  await page.getByRole("button", { name: "Talep gönder" }).click();
  expect((await response).status()).toBe(503);
  await expect(page.locator("form").getByRole("alert")).toContainText("kaydedildiğini doğrulayamadık");
  await expect(page.getByRole("heading", { name: "Talebiniz kaydedildi." })).not.toBeVisible();
  await expect(page.getByLabel("Ad soyad")).toHaveValue("Deniz Yılmaz");
  await expect(page.getByRole("button", { name: "Talep gönder" })).toBeEnabled();
});

test("server validation errors are associated with the field", async ({ page }) => {
  await page.route("**/api/requests", (route) => route.fulfill({ status: 422, json: { errors: { email: ["Geçerli bir e-posta adresi yazın."] } } }));
  await page.goto("/");
  await fillForm(page);
  await page.getByRole("button", { name: "Talep gönder" }).click();
  await expect(page.getByLabel("E-posta")).toBeFocused();
  await expect(page.getByLabel("E-posta")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("E-posta")).toHaveAttribute("aria-describedby", "email-error");
});

test("direct API input is rejected without client validation", async ({ request }) => {
  const response = await request.post("/api/requests", { data: { email: "bad" } });
  expect(response.status()).toBe(422);
});

for (const failure of ["network", "missing-receipt"] as const) {
  test(`${failure} does not produce success and keeps the form retryable`, async ({ page }) => {
    await page.route("**/api/requests", (route) => failure === "network"
      ? route.abort("failed")
      : route.fulfill({ status: 201, json: { message: "unconfirmed" } }));
    await page.goto("/");
    await fillForm(page);
    await page.getByRole("button", { name: "Talep gönder" }).click();
    await expect(page.locator("form").getByRole("alert")).toContainText("kaydedildiğini doğrulayamadık");
    await expect(page.getByRole("heading", { name: "Talebiniz kaydedildi." })).not.toBeVisible();
    await expect(page.getByLabel("E-posta")).toHaveValue("deniz@example.com");
    await expect(page.getByRole("button", { name: "Talep gönder" })).toBeEnabled();
  });
}

test("keyboard users can skip navigation and reach the form controls", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "İçeriğe geç" })).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Sürecinizi konuşalım" })).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Ad soyad")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("E-posta")).toBeFocused();
});

for (const width of [320, 390, 768, 1440]) {
  test(`layout and form fit a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole("link", { name: "Birlikte başlayalım" }).click();
    await expect(page.getByLabel("Ad soyad")).toBeVisible();
    await page.screenshot({ path: `test-results/layout-${width}.png`, fullPage: true });
  });
}
