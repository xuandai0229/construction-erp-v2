import assert from "node:assert/strict";
import test from "node:test";
import {
  canViewApprovalDashboard,
  canViewCompanyWideDashboard,
  canViewFinanceDashboard,
  getDashboardProjectScope,
} from "./dashboard-permissions";
import { formatCurrencyVND, formatDateTimeVN, formatDateVNShort, formatPercentVN } from "./dashboard-formatters";

test("dashboard finance permissions only allow leadership and accountant roles", () => {
  assert.equal(canViewFinanceDashboard("ADMIN"), true);
  assert.equal(canViewFinanceDashboard("DIRECTOR"), true);
  assert.equal(canViewFinanceDashboard("DEPUTY_DIRECTOR"), true);
  assert.equal(canViewFinanceDashboard("ACCOUNTANT"), true);
  assert.equal(canViewFinanceDashboard("CHIEF_COMMANDER"), false);
  assert.equal(canViewFinanceDashboard("ENGINEER"), false);
  assert.equal(canViewFinanceDashboard("STAFF"), false);
});

test("dashboard company-wide and approval permissions follow RBAC policy", () => {
  assert.equal(canViewCompanyWideDashboard("DIRECTOR"), true);
  assert.equal(canViewCompanyWideDashboard("MANAGER"), false);
  assert.equal(canViewApprovalDashboard("MANAGER"), true);
  assert.equal(canViewApprovalDashboard("ACCOUNTANT"), true);
  assert.equal(canViewApprovalDashboard("ENGINEER"), false);
});

test("dashboard project scope preserves all-project and assigned-project modes", () => {
  assert.deepEqual(getDashboardProjectScope(null), { allProjects: true, projectIds: null });
  assert.deepEqual(getDashboardProjectScope(["p1", "p2"]), { allProjects: false, projectIds: ["p1", "p2"] });
  assert.deepEqual(getDashboardProjectScope([]), { allProjects: false, projectIds: [] });
});

test("dashboard formatters output Vietnamese currency, date and percent formats", () => {
  const date = new Date("2026-06-29T08:30:00.000Z");

  assert.equal(formatCurrencyVND(1250000000), "1.250.000.000 ₫");
  assert.equal(formatPercentVN(75.4), "75%");
  assert.equal(formatPercentVN(null), "-");
  assert.equal(formatDateVNShort(date), "29/06/2026");
  assert.match(formatDateTimeVN(date), /^29\/06\/2026 \d{2}:\d{2}$/);
});
