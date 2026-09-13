import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "parallel" });

// --------------------------------------------------
// HOME
// --------------------------------------------------

test("Home page works", async ({ page }) => {
    await page.goto("http://localhost:3000/");
    await expect(page).toHaveURL("http://localhost:3000/");

    await expect(
        page.getByText("THE COMPETITION STARTS HERE")
    ).toBeVisible();

});

// --------------------------------------------------
// MATCHES
// --------------------------------------------------

test("Matches page works", async ({ page }) => {

    await page.goto("http://localhost:3000/matches");

    await expect(
        page.getByRole("heading", { name: "Matches" })
    ).toBeVisible();

    await expect(
        page.getByText("NovaMotion FC").first()
    ).toBeVisible();

    await expect(
        page.getByText("Sweeper Boyz").first()
    ).toBeVisible();
});

// --------------------------------------------------
// STANDINGS
// --------------------------------------------------

test("Standings page works", async ({ page }) => {

    await page.goto("http://localhost:3000/standings");

    await expect(
        page.getByText("League Standings")
    ).toBeVisible();

    await expect(
        page.getByText("DZ Power")
    ).toBeVisible();
});

// --------------------------------------------------
// PLAYERS
// --------------------------------------------------

test("Players page works", async ({ page }) => {

  await page.goto("http://localhost:3000/players");

  await expect(
    page.getByText("PLAYER STATISTICS")
  ).toBeVisible();

  await expect(
    page.getByRole("button", { name: /MVP Race/i })
  ).toBeVisible();

});