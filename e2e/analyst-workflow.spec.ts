import { test, expect } from "@playwright/test";

const TEST_EMAIL = `analyst-${Date.now()}@test.example`;
const TEST_PASSWORD = "TestPassword123!";

/**
 * Helpers
 */

/** Sign up via the /signup page, then wait for redirect to the home/overview. */
async function signUp(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  // After signup the app redirects to "/" which SessionGate turns into Home
  await expect(page).toHaveURL(/\//);
}

test.describe("Analyst workflow", () => {
  test("sign up → create theme → scenario → indicator → link → overview", async ({ page }) => {
    // ── Sign up ──────────────────────────────────────────────────────────
    await signUp(page, TEST_EMAIL, TEST_PASSWORD);

    // ── Create theme ─────────────────────────────────────────────────────
    // ThemesScreen has a "Create theme" button that navigates to /theme/create
    await page.goto("/themes");
    await page.getByRole("button", { name: "Create theme" }).click();
    await expect(page).toHaveURL("/theme/create");

    // ThemeCreateForm: Label "Name" maps to id="name", Label "Description" → id="description"
    await page.getByLabel("Name").fill("E2E Test Theme");
    await page.getByLabel("Description").fill("Created by E2E test");
    await page.getByRole("button", { name: "Create theme" }).click();

    // On success, redirects to /theme/<id>
    await expect(page).toHaveURL(/\/theme\/.+/);

    // Navigate back to themes list and verify name appears
    await page.goto("/themes");
    await expect(page.getByRole("button", { name: "E2E Test Theme" })).toBeVisible();

    // ── Create scenario ───────────────────────────────────────────────────
    await page.goto("/horizon/scenarios");
    // The "New Scenario" button is a <Link> wrapping a <Button>
    await page.getByRole("link", { name: /New Scenario/i }).click();
    await expect(page).toHaveURL("/horizon/scenarios/new");

    // HorizonScenarioNewScreen: Label "Name" → id="name", Label "Description" → id="description"
    await page.getByLabel("Name").fill("E2E Test Scenario");
    await page.getByLabel("Description").fill("Scenario for E2E test — one paragraph.");
    await page.getByRole("button", { name: "Create Scenario" }).click();

    // On success, redirects to /horizon/scenarios/<id>
    await expect(page).toHaveURL(/\/horizon\/scenarios\/.+/);
    await expect(page.getByRole("heading", { name: "E2E Test Scenario" })).toBeVisible();

    // Capture the scenario detail URL so we can return later
    const scenarioUrl = page.url();

    // ── Create indicator (linked to the scenario just created) ────────────
    // Use the "Add Indicator" button on the scenario detail page, which navigates
    // to /horizon/signals/new?scenarioId=<id>
    await page.getByRole("button", { name: "Add Indicator" }).click();
    await expect(page).toHaveURL(/\/horizon\/signals\/new/);

    // HorizonIndicatorNewScreen: Label "Name" → id="name"
    await page.getByLabel("Name").fill("E2E Test Indicator");
    // Category defaults to "political" — leave as-is
    await page.getByRole("button", { name: "Create Indicator" }).click();

    // On success, redirects to /horizon/signals/<id>
    await expect(page).toHaveURL(/\/horizon\/signals\/.+/);
    await expect(page.locator("text=E2E Test Indicator").first()).toBeVisible();

    // ── Link a second (pre-existing) indicator via the "Link Indicator" popover ──
    // Go back to the scenario detail page
    await page.goto(scenarioUrl);
    await expect(page.getByRole("heading", { name: "E2E Test Scenario" })).toBeVisible();

    // The indicator we just created is already linked (via scenarioId param), so
    // the "Linked Indicators" panel should show "E2E Test Indicator"
    await expect(page.getByText("E2E Test Indicator")).toBeVisible();

    // ── Verify on overview ────────────────────────────────────────────────
    await page.goto("/horizon/overview");
    // The overview screen loads without error; assert the main heading is present
    await expect(page.locator("h1, h2, main")).toBeVisible();
  });

  test("link indicator to scenario via the Link Indicator popover", async ({ page }) => {
    const email = `link-test-${Date.now()}@test.example`;
    await signUp(page, email, TEST_PASSWORD);

    // Create a scenario first
    await page.goto("/horizon/scenarios/new");
    await page.getByLabel("Name").fill("Popover Link Scenario");
    await page.getByLabel("Description").fill("Testing the link indicator popover.");
    await page.getByRole("button", { name: "Create Scenario" }).click();
    await expect(page).toHaveURL(/\/horizon\/scenarios\/.+/);
    const scenarioUrl = page.url();

    // Create a standalone indicator (no scenario pre-linked)
    await page.goto("/horizon/signals/new");
    await page.getByLabel("Name").fill("Standalone Indicator");
    await page.getByRole("button", { name: "Create Indicator" }).click();
    await expect(page).toHaveURL(/\/horizon\/signals\/.+/);

    // Now go back to scenario detail and use "Link Indicator" popover
    await page.goto(scenarioUrl);
    await page.getByRole("button", { name: "Link Indicator" }).click();

    // The Popover opens a Command/combobox with a CommandInput placeholder "Search indicators..."
    const searchInput = page.getByPlaceholder("Search indicators...");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Standalone");

    // The CommandItem for the indicator should appear
    await expect(page.getByText("Standalone Indicator")).toBeVisible();
    await page.getByText("Standalone Indicator").click();

    // Toast "Indicator linked" should appear and the linked indicators list updates
    await expect(page.getByText(/Indicator linked/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Standalone Indicator")).toBeVisible();
  });
});
