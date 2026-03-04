/// <reference types="cypress" />

type CommonPageTestHooksOptions = {
  timeoutMs?: number;
  orgMemberRole?: string;
};

export function setupCommonPageTestHooks(
  apiBase: string,
  options: CommonPageTestHooksOptions = {},
): void {
  const { timeoutMs = 20_000, orgMemberRole = "owner" } = options;
  const originalDefaultCommandTimeout = Cypress.config("defaultCommandTimeout");

  beforeEach(() => {
    Cypress.config("defaultCommandTimeout", timeoutMs);

    cy.intercept("GET", "**/healthz", {
      statusCode: 200,
      body: { ok: true },
    }).as("healthz");

    cy.intercept("GET", `${apiBase}/organizations/me/member*`, {
      statusCode: 200,
      body: { organization_id: "org1", role: orgMemberRole },
    }).as("orgMeMember");
  });

  afterEach(() => {
    Cypress.config("defaultCommandTimeout", originalDefaultCommandTimeout);
  });
}
