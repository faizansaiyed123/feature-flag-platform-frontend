import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const stamp = Date.now();
const credentials = {
  displayName: "Flagship E2E User",
  organization: `Flagship E2E Workspace ${stamp}`,
  email: `flagship-e2e-${stamp}@example.com`,
  password: "FlagshipE2E!12345",
};

let projectId = "";
let environmentId = "";
const environmentKey = "production";
let sdkKey = "";
const flagKey = "checkout-redesign";
const segmentKey = "beta-users";

function watchApiFailures(page: import("@playwright/test").Page) {
  const failures: string[] = [];
  page.on("response", (response) => {
    if (response.url().includes("/api/v1/") && response.status() >= 500) {
      failures.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });
  return failures;
}

async function takeScreenshot(page: import("@playwright/test").Page, name: string) {
  await page.screenshot({
    path: `docs/testing/visuals/${name}.png`,
    fullPage: true,
  });
}

test("real product lifecycle: signup → project → environment → flag → segment → rule → evaluation", async ({ page }) => {
  const apiFailures = watchApiFailures(page);

  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Create your workspace" })).toBeVisible();
  await takeScreenshot(page, "01-signup");
  await page.getByLabel("Your name").fill(credentials.displayName);
  await page.getByLabel("Organization").fill(credentials.organization);
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);

  const signupResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/auth/signup") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Create workspace" }).click();
  expect((await signupResponse).status()).toBe(201);
  await expect(page).toHaveURL(/\/app$/);
  await takeScreenshot(page, "02-overview-empty");

  await page.goto("/app/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

  const projectForm = page.locator("form").filter({ hasText: "New project" });
  await projectForm.locator('input[name="name"]').fill("Checkout Platform");
  await projectForm.locator('input[name="key"]').fill("checkout");
  await projectForm.locator('textarea[name="description"]').fill("Release controls for checkout behavior");

  const projectResponse = page.waitForResponse(
    (response) => /\/api\/v1\/organizations\/[^/]+\/projects$/.test(response.url()) && response.request().method() === "POST",
  );
  await projectForm.getByRole("button", { name: "Create project" }).click();
  const projectPayload = await (await projectResponse).json();
  projectId = projectPayload.id;
  expect(projectId).toBeTruthy();

  const environmentForm = page.locator("form").filter({ hasText: "New environment" });
  await environmentForm.locator('input[name="name"]').fill("Production");
  await environmentForm.locator('input[name="key"]').fill(environmentKey);

  await environmentForm.getByRole("button", { name: "Create environment" }).click();
  await expect(page.getByText("Store this SDK key", { exact: false })).toBeVisible();
  sdkKey = (await page.locator(".key-reveal code").innerText()).trim();
  expect(sdkKey).toMatch(/^ffp_/);
  environmentId = await page.locator('#environment-select option:not([value=""])').first().getAttribute("value") || "";
  expect(environmentId).toBeTruthy();
  await takeScreenshot(page, "03-settings-project-environment");

  await page.goto("/app/segments");
  await expect(page.getByRole("heading", { name: "Segments", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "+ New segment" }).click();
  await page.locator('input[name="key"]').fill(segmentKey);
  await page.locator('input[name="name"]').fill("Beta users");
  await page.locator('textarea[name="description"]').fill("Users eligible for the checkout beta");

  const segmentCreateResponse = page.waitForResponse(
    (response) => /\/api\/v1\/projects\/[^/]+\/segments$/.test(response.url()) && response.request().method() === "POST",
  );
  await page.locator("form").filter({ hasText: "Create segment" }).getByRole("button", { name: "Create segment" }).click();
  expect((await segmentCreateResponse).status()).toBe(201);

  const segmentCard = page.locator(".segment-card").filter({ hasText: segmentKey });
  await expect(segmentCard).toBeVisible();
  await segmentCard.getByRole("button", { name: "+ Add condition" }).click();
  await segmentCard.getByLabel("Condition 1 attribute").fill("plan");
  await segmentCard.getByLabel("Condition 1 operator").selectOption("equals");
  await segmentCard.getByLabel("Condition 1 value").fill("pro");

  const segmentUpdateResponse = page.waitForResponse(
    (response) => /\/api\/v1\/segments\/[^/]+$/.test(response.url()) && response.request().method() === "PATCH",
  );
  await segmentCard.getByRole("button", { name: "Save conditions" }).click();
  expect((await segmentUpdateResponse).status()).toBe(200);

  await page.reload();
  await expect(page.locator(".segment-card").filter({ hasText: segmentKey }).getByLabel("Condition 1 attribute")).toHaveValue("plan");
  await takeScreenshot(page, "04-segments-targeting-audience");

  await page.goto("/app/flags");
  await expect(page.getByRole("heading", { name: "Feature flags" })).toBeVisible();
  await page.getByRole("button", { name: "+ New flag" }).click();
  await page.locator('input[name="key"]').fill(flagKey);
  await page.locator('input[name="name"]').fill("Checkout redesign");
  await page.locator('textarea[name="description"]').fill("Controlled release of the new checkout experience");
  await page.locator('select[name="flag_type"]').selectOption("boolean");
  await page.locator('input[name="default_value"]').fill("false");

  const flagCreateResponse = page.waitForResponse(
    (response) => /\/api\/v1\/projects\/[^/]+\/flags$/.test(response.url()) && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Create flag" }).click();
  expect((await flagCreateResponse).status()).toBe(201);
  await expect(page.getByText(flagKey, { exact: true })).toBeVisible();

  const toggleResponse = page.waitForResponse(
    (response) => /\/api\/v1\/flags\/[^/]+\/environments\/[^/]+$/.test(response.url()) && response.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: `Toggle ${flagKey}` }).click();
  expect((await toggleResponse).status()).toBe(200);

  const targetingPanel = page.locator(".panel").filter({ hasText: `Targeting · ${flagKey}` });
  await targetingPanel.getByRole("button", { name: "Configure" }).click();

  const addRuleResponse = page.waitForResponse(
    (response) => /\/api\/v1\/flags\/[^/]+\/environments\/[^/]+\/rules$/.test(response.url()) && response.request().method() === "POST",
  );
  await targetingPanel.getByRole("button", { name: /\+ Rule/ }).click();
  expect((await addRuleResponse).status()).toBe(201);

  const ruleCard = page.locator(".rule-card").first();
  await expect(ruleCard).toBeVisible();
  await ruleCard.getByLabel("Rule name").fill("Beta checkout rollout");
  await ruleCard.getByLabel("Serve value").fill("true");
  await ruleCard.getByLabel("Segments").selectOption(segmentKey);

  const ruleSaveResponse = page.waitForResponse(
    (response) => /\/api\/v1\/rules\/[^/]+$/.test(response.url()) && response.request().method() === "PATCH",
  );
  await ruleCard.getByRole("button", { name: "Save rule" }).click();
  expect((await ruleSaveResponse).status()).toBe(200);
  await expect(ruleCard.getByText("Saved", { exact: true })).toBeVisible();
  await takeScreenshot(page, "05-feature-flags-and-targeting");

  await page.goto("/app/simulator");
  await expect(page.getByRole("heading", { name: "Rollout simulator" })).toBeVisible();
  await page.locator(".field").filter({ hasText: "Feature flag" }).locator("select").selectOption(flagKey);
  await page.locator(".field").filter({ hasText: "Users JSON" }).locator("textarea").fill(
    JSON.stringify([
      { user_id: "e2e-pro", attributes: { plan: "pro", country: "IN" } },
      { user_id: "e2e-free", attributes: { plan: "free", country: "IN" } },
    ]),
  );

  const simulationResponse = page.waitForResponse(
    (response) => /\/api\/v1\/projects\/[^/]+\/simulate$/.test(response.url()) && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Run simulation" }).click();
  const simulationPayload = await (await simulationResponse).json();
  expect(simulationPayload.results).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ user_id: "e2e-pro", value: true, reason: "targeting_rule" }),
      expect.objectContaining({ user_id: "e2e-free", value: false, reason: "default" }),
    ]),
  );
  await expect(page.getByRole("row", { name: /e2e-pro.*true.*targeting_rule/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /e2e-free.*false.*default/ })).toBeVisible();
  await takeScreenshot(page, "06-rollout-simulator");

  await page.goto("/app/api");
  await expect(page.getByRole("heading", { name: "API & SDK" })).toBeVisible();
  const rotateResponse = page.waitForResponse(
    (response) => /\/api\/v1\/environments\/[^/]+\/keys\/rotate$/.test(response.url()) && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Rotate SDK key" }).click();
  const rotatePayload = await (await rotateResponse).json();
  sdkKey = rotatePayload.sdk_key;
  expect(sdkKey).toMatch(/^ffp_/);
  await expect(page.getByText("New SDK key", { exact: false })).toBeVisible();

  const externalEvaluation = await page.request.post(
    `${process.env.PLAYWRIGHT_API_BASE_URL || "http://127.0.0.1:8000/api/v1"}/evaluate/${environmentKey}/${flagKey}`,
    {
      headers: { "X-Feature-Key": sdkKey },
      data: { user_id: "e2e-pro", attributes: { plan: "pro", country: "IN" } },
    },
  );
  expect(externalEvaluation.status()).toBe(200);
  const evaluationPayload = await externalEvaluation.json();
  expect(evaluationPayload).toMatchObject({ flag_key: flagKey, value: true, reason: "targeting_rule" });
  await takeScreenshot(page, "07-api-and-sdk");

  await page.goto("/app/audit");
  await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
  await expect(page.getByText("flag.created", { exact: true })).toBeVisible();
  await expect(page.getByText("targeting_rule.created", { exact: true })).toBeVisible();
  await takeScreenshot(page, "08-audit-history");

  await page.goto("/app/team");
  await expect(page.getByRole("heading", { name: "Team access" })).toBeVisible();
  await expect(page.locator("table").getByText(credentials.email, { exact: true })).toBeVisible();
  await expect(page.getByText("owner", { exact: true }).first()).toBeVisible();
  await takeScreenshot(page, "09-team-access");

  const overviewResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/v1/projects/${projectId}/overview`) &&
      response.request().method() === "GET",
  );
  await page.goto("/app");
  const overviewPayloadResponse = await overviewResponse;
  expect(overviewPayloadResponse.status()).toBe(200);
  const overviewPayload = await overviewPayloadResponse.json();
  expect(overviewPayload).toMatchObject({ flags: 1, enabled_flags: 1, targeting_rules: 1 });
  await expect(page.getByRole("heading", { name: "Checkout Platform" })).toBeVisible();
  await expect(page.getByText("checkout-redesign", { exact: true })).toBeVisible();
  await takeScreenshot(page, "10-overview");
  expect(apiFailures).toEqual([]);
});

test("authenticated session, console routes, and mobile navigation stay usable", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const apiFailures = watchApiFailures(page);

  await page.goto("/login");
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  const loginResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/auth/login") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Sign in" }).click();
  expect((await loginResponse).status()).toBe(200);
  await expect(page).toHaveURL(/\/app$/);

  const routes = [
    { path: "/app", heading: "Checkout Platform", api: /\/api\/v1\/projects\/[^/]+\/(overview|flags)/, image: "11-route-overview" },
    { path: "/app/flags", heading: "Feature flags", api: /\/api\/v1\/projects\/[^/]+\/(flags|segments)/, image: "12-route-flags" },
    { path: "/app/segments", heading: "Segments", api: /\/api\/v1\/projects\/[^/]+\/segments/, image: "13-route-segments" },
    { path: "/app/simulator", heading: "Rollout simulator", api: /\/api\/v1\/projects\/[^/]+\/flags/, image: "14-route-simulator" },
    { path: "/app/team", heading: "Team access", api: /\/api\/v1\/organizations\/[^/]+\/members/, image: "15-route-team" },
    { path: "/app/audit", heading: "Audit log", api: /\/api\/v1\/projects\/[^/]+\/audit-logs/, image: "16-route-audit" },
    { path: "/app/api", heading: "API & SDK", api: /\/api\/v1\/environments\/[^/]+\/keys/, image: "17-route-api" },
    { path: "/app/settings", heading: "Settings", api: /\/api\/v1\/(organizations\/[^/]+\/projects|projects\/[^/]+\/environments)/, image: "18-route-settings" },
  ];

  for (const route of routes) {
    let seen = false;
    const listener = (response: import("@playwright/test").Response) => {
      if (route.api.test(response.url()) && response.status() < 400) seen = true;
    };
    page.on("response", listener);
    await page.goto(route.path);
    await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.locator("body")).not.toContainText("Unhandled Runtime Error");
    await expect.poll(() => seen).toBe(true);
    await takeScreenshot(page, route.image);
    page.off("response", listener);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app");
  await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("navigation", { name: "Control plane" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Feature flags" })).toBeVisible();
  await takeScreenshot(page, "19-mobile-navigation");

  await page.getByRole("link", { name: "Feature flags" }).click();
  await expect(page.getByRole("heading", { name: "Feature flags" })).toBeVisible();

  await page.goto("/app");
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);

  expect(apiFailures).toEqual([]);
  await context.close();
});
