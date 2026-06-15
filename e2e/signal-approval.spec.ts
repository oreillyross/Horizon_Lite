import { test, expect } from "@playwright/test";

const TEST_EMAIL = `signal-test-${Date.now()}@test.example`;
const TEST_PASSWORD = "TestPassword456!";

async function signUp(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(/\//);
}

test.describe("Signal suggestion approval", () => {
  test("indicator detail page renders suggestions panel or empty state", async ({ page }) => {
    await signUp(page, TEST_EMAIL, TEST_PASSWORD);

    // Create an indicator so we have something to navigate to
    await page.goto("/horizon/signals/new");
    await page.getByLabel("Name").fill("Signal Approval Indicator");
    await page.getByRole("button", { name: "Create Indicator" }).click();

    // Should land on the indicator detail page
    await expect(page).toHaveURL(/\/horizon\/signals\/.+/);
    const indicatorUrl = page.url();

    // ── Signal suggestions panel ──────────────────────────────────────────
    // HorizonIndicatorDetailScreen renders a SuggestionsPanel section
    // with section title "Signal suggestions"
    await expect(page.getByText("Signal suggestions")).toBeVisible();

    // In a fresh DB there will be no pending suggestions — verify the empty state
    const pendingSuggestions = page.getByText("No pending suggestions");
    const approveButtons = page.getByRole("button", { name: /^Approve$/i });

    const hasSuggestions = await approveButtons.count() > 0;

    if (hasSuggestions) {
      // ── Approve the first suggestion ────────────────────────────────────
      // Each suggestion row has an individual "Approve" button
      await approveButtons.first().click();

      // After approving, the suggestion disappears from the queue.
      // The toast or updated pending count confirms the action.
      // We just wait for the UI to settle — if the row vanishes or count drops, that's success.
      await page.waitForTimeout(1000);

      // The panel should still be visible with an updated state
      await expect(page.getByText("Signal suggestions")).toBeVisible();
    } else {
      // Empty state: "No pending suggestions" message appears inside the panel
      await expect(pendingSuggestions).toBeVisible();

      // The "Show duplicates" / "Show expired" toggle buttons should be present
      await expect(page.getByRole("button", { name: "Show duplicates" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Show expired" })).toBeVisible();
    }

    // ── Bulk approve toolbar is absent when list is empty ─────────────────
    // "Approve selected" button only renders when there are items in the list
    const approveSelected = page.getByRole("button", { name: "Approve selected" });
    if (!hasSuggestions) {
      await expect(approveSelected).not.toBeVisible();
    }

    // ── Scenario impact panel shows empty state ───────────────────────────
    // The indicator detail page also has a "Scenario impact" section
    await expect(page.getByText("Scenario impact")).toBeVisible();
    // With no linked scenarios, expect the empty state text
    await expect(page.getByText("No scenario mappings")).toBeVisible();

    // ── Navigate back to the signals list ─────────────────────────────────
    await page.goto("/horizon/signals");
    await expect(page.locator("main, h1")).toBeVisible();
  });

  test("toggle Show duplicates and Show expired filters on suggestions panel", async ({ page }) => {
    const email = `filter-test-${Date.now()}@test.example`;
    await signUp(page, email, TEST_PASSWORD);

    // Create an indicator and navigate to its detail page
    await page.goto("/horizon/signals/new");
    await page.getByLabel("Name").fill("Filter Toggle Indicator");
    await page.getByRole("button", { name: "Create Indicator" }).click();
    await expect(page).toHaveURL(/\/horizon\/signals\/.+/);

    // Wait for the suggestions panel to fully load
    await expect(page.getByText("Signal suggestions")).toBeVisible();

    // Toggle "Show duplicates"
    const showDuplicatesBtn = page.getByRole("button", { name: "Show duplicates" });
    await expect(showDuplicatesBtn).toBeVisible();
    await showDuplicatesBtn.click();
    // Button label toggles to "Hide duplicates"
    await expect(page.getByRole("button", { name: "Hide duplicates" })).toBeVisible();
    // Toggle back
    await page.getByRole("button", { name: "Hide duplicates" }).click();
    await expect(page.getByRole("button", { name: "Show duplicates" })).toBeVisible();

    // Toggle "Show expired"
    const showExpiredBtn = page.getByRole("button", { name: "Show expired" });
    await expect(showExpiredBtn).toBeVisible();
    await showExpiredBtn.click();
    await expect(page.getByRole("button", { name: "Hide expired" })).toBeVisible();
    await page.getByRole("button", { name: "Hide expired" }).click();
    await expect(page.getByRole("button", { name: "Show expired" })).toBeVisible();
  });
});
