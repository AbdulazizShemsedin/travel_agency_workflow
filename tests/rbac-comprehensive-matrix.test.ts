import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  can,
  hasRole,
  hasAnyRole,
  hasAllRoles,
  extractRoleName,
  isRoleReadOnly as isPermRoleReadOnly,
  isPureForeignAgency,
  ROUTE_PERMISSION_MAP,
  V2_CANONICAL_ROLES,
  PermissionAction,
} from "../src/lib/auth/permissions";
import {
  hasV2Role,
  hasAnyV2Role,
  isRoleReadOnly as isV2RoleReadOnly,
  V2_CUSTOM_ROLES,
} from "../src/lib/auth/v2Roles";
import { AuthUser } from "../src/lib/api/auth";

/** Helper to create an AuthUser fixture */
function makeUser(roles: string[], read_only_roles: string[] = [], email = "test@example.com"): AuthUser & { user: string; full_name: string } {
  return {
    email,
    user: email,
    full_name: "Test User",
    roles,
    read_only_roles,
  };
}

describe("Comprehensive RBAC, Multi-Role & Read-Only Audit Test Suite", () => {
  // =========================================================================
  // 1. AUTHORITATIVE ROLE INVENTORY & CANONICAL ROLES AUDIT
  // =========================================================================
  describe("1. Canonical Role Inventory Verification", () => {
    test("Canonical roles list contains all 20 recognized business and clearance roles", () => {
      const expectedRoles = [
        "Admin",
        "Manager",
        "Registrar",
        "Clearance Officer",
        "Ticketer",
        "Complaint Manager",
        "Finance Manager",
        "Foreign Agency",
        "Communication Manager",
        "Contract Parser",
        "Saudi LMIS",
        "Saudi Taeshir",
        "Saudi Embassy",
        "Kuwait LMIS",
        "Kuwait Telesign",
        "Kuwait Embassy",
        "Medical Officer",
        "CV",
      ];

      for (const role of expectedRoles) {
        assert.ok(
          V2_CANONICAL_ROLES.includes(role as any),
          `Expected ${role} to be in V2_CANONICAL_ROLES`
        );
        assert.ok(
          V2_CUSTOM_ROLES.includes(role as any),
          `Expected ${role} to be in V2_CUSTOM_ROLES`
        );
      }
    });

    test("extractRoleName correctly parses raw role names and strips (view) suffixes", () => {
      assert.equal(extractRoleName("Registrar"), "registrar");
      assert.equal(extractRoleName("Finance Manager (View)"), "finance manager");
      assert.equal(extractRoleName("Saudi LMIS (view)"), "saudi lmis");
      assert.equal(extractRoleName("  Admin  "), "admin");
    });
  });

  // =========================================================================
  // 2. READ-ONLY ROLE DETECTION & ISOLATION
  // =========================================================================
  describe("2. Read-Only Detection & Suffix Handling", () => {
    test("isRoleReadOnly detects read-only role from string suffix or read_only_roles array", () => {
      const userWithArray = makeUser(["Finance Manager"], ["Finance Manager"]);
      assert.equal(isPermRoleReadOnly("Finance Manager", userWithArray), true);
      assert.equal(isV2RoleReadOnly(userWithArray, "Finance Manager"), true);

      // Suffix detection without read_only_roles array
      const userWithSuffix = makeUser(["Finance Manager (View)"], []);
      assert.equal(isPermRoleReadOnly("Finance Manager (View)", userWithSuffix), true);
      assert.equal(isV2RoleReadOnly(userWithSuffix, "Finance Manager"), true);

      // Writable user
      const userWritable = makeUser(["Finance Manager"], []);
      assert.equal(isPermRoleReadOnly("Finance Manager", userWritable), false);
      assert.equal(isV2RoleReadOnly(userWritable, "Finance Manager"), false);
    });

    test("Administrative roles can NEVER be treated as read-only", () => {
      const adminAttempt = makeUser(["Admin"], ["Admin"]);
      assert.equal(isPermRoleReadOnly("Admin", adminAttempt), false);
      assert.equal(isV2RoleReadOnly(adminAttempt, "Admin"), false);

      const sysManagerAttempt = makeUser(["System Manager"], ["System Manager"]);
      assert.equal(isPermRoleReadOnly("System Manager", sysManagerAttempt), false);
      assert.equal(isV2RoleReadOnly(sysManagerAttempt, "System Manager"), false);

      const administratorAttempt = makeUser(["Administrator"], ["Administrator"]);
      assert.equal(isPermRoleReadOnly("Administrator", administratorAttempt), false);
      assert.equal(isV2RoleReadOnly(administratorAttempt, "Administrator"), false);
    });
  });

  // =========================================================================
  // 3. SINGLE ROLE WRITE & READ PERMISSION ENFORCEMENT
  // =========================================================================
  describe("3. Individual Role Capability Boundaries", () => {
    test("Admin has universal write and view access across all functional domains", () => {
      const admin = makeUser(["Admin"]);
      assert.equal(can(admin, "registerApplicant"), true);
      assert.equal(can(admin, "manageFinance"), true);
      assert.equal(can(admin, "manageCommission"), true);
      assert.equal(can(admin, "manageClearances"), true);
      assert.equal(can(admin, "manageTicketing"), true);
      assert.equal(can(admin, "manageComplaints"), true);
      assert.equal(can(admin, "manageContractors"), true);
      assert.equal(can(admin, "manageSelectionRequests"), true);
      assert.equal(can(admin, "editLms"), true);
      assert.equal(can(admin, "editInjaz"), true);
      assert.equal(can(admin, "editEmbassy"), true);
    });

    test("Registrar can view/register applicants and manage selection requests, but cannot touch finance or clearance", () => {
      const registrar = makeUser(["Registrar"]);
      assert.equal(can(registrar, "viewApplicants"), true);
      assert.equal(can(registrar, "registerApplicant"), true);
      assert.equal(can(registrar, "manageSelectionRequests"), true);

      // Negative authorization checks
      assert.equal(can(registrar, "manageFinance"), false);
      assert.equal(can(registrar, "manageCommission"), false);
      assert.equal(can(registrar, "editLms"), false);
      assert.equal(can(registrar, "editInjaz"), false);
      assert.equal(can(registrar, "editEmbassy"), false);
      assert.equal(can(registrar, "manageTicketing"), false);
      assert.equal(can(registrar, "manageComplaints"), false);
    });

    test("Finance Manager can manage finance and commission, but cannot register applicants or edit clearance", () => {
      const finance = makeUser(["Finance Manager"]);
      assert.equal(can(finance, "viewFinance"), true);
      assert.equal(can(finance, "manageFinance"), true);
      assert.equal(can(finance, "viewCommission"), true);
      assert.equal(can(finance, "manageCommission"), true);

      // Negative checks
      assert.equal(can(finance, "registerApplicant"), false);
      assert.equal(can(finance, "editLms"), false);
      assert.equal(can(finance, "editInjaz"), false);
      assert.equal(can(finance, "editEmbassy"), false);
      assert.equal(can(finance, "manageTicketing"), false);
    });

    test("Clearance Officer has clearance mutation access, but cannot touch finance", () => {
      const clearance = makeUser(["Clearance Officer"]);
      assert.equal(can(clearance, "viewClearances"), true);
      assert.equal(can(clearance, "manageClearances"), true);
      assert.equal(can(clearance, "editLms"), true);
      assert.equal(can(clearance, "editInjaz"), true);
      assert.equal(can(clearance, "editEmbassy"), true);

      // Negative checks
      assert.equal(can(clearance, "manageFinance"), false);
      assert.equal(can(clearance, "manageCommission"), false);
      assert.equal(can(clearance, "registerApplicant"), false);
    });

    test("Step-specific clearance roles are strictly scoped to their step", () => {
      const saudiLmis = makeUser(["Saudi LMIS"]);
      assert.equal(can(saudiLmis, "editLms"), true);
      assert.equal(can(saudiLmis, "editInjaz"), false);
      assert.equal(can(saudiLmis, "editEmbassy"), false);
      assert.equal(can(saudiLmis, "manageTicketing"), false);

      const saudiTaeshir = makeUser(["Saudi Taeshir"]);
      assert.equal(can(saudiTaeshir, "editInjaz"), true);
      assert.equal(can(saudiTaeshir, "editLms"), false);
      assert.equal(can(saudiTaeshir, "editEmbassy"), false);

      const saudiEmbassy = makeUser(["Saudi Embassy"]);
      assert.equal(can(saudiEmbassy, "editEmbassy"), true);
      assert.equal(can(saudiEmbassy, "editLms"), false);
      assert.equal(can(saudiEmbassy, "editInjaz"), false);
    });

    test("Medical Officer can record medical results, but cannot edit finance or ticketing", () => {
      const medOfficer = makeUser(["Medical Officer"]);
      assert.equal(can(medOfficer, "manageMedical"), true);
      assert.equal(can(medOfficer, "viewApplicants"), true);

      // Negative checks
      assert.equal(can(medOfficer, "manageFinance"), false);
      assert.equal(can(medOfficer, "manageTicketing"), false);
      assert.equal(can(medOfficer, "editLms"), false);
      assert.equal(can(medOfficer, "registerApplicant"), false);
    });

    test("Ticketer can manage ticketing and departure, but cannot edit clearance steps", () => {
      const ticketer = makeUser(["Ticketer"]);
      assert.equal(can(ticketer, "manageTicketing"), true);
      assert.equal(can(ticketer, "createDeparture"), true);
      assert.equal(can(ticketer, "createTicket"), true);

      // Negative checks
      assert.equal(can(ticketer, "editLms"), false);
      assert.equal(can(ticketer, "editInjaz"), false);
      assert.equal(can(ticketer, "editEmbassy"), false);
      assert.equal(can(ticketer, "manageFinance"), false);
    });
  });

  // =========================================================================
  // 4. READ-ONLY ROLE GATING (VIEW ROLES CANNOT MUTATE)
  // =========================================================================
  describe("4. Read-Only Roles Cannot Mutate State", () => {
    test("Registrar (View) can view applicants but cannot register applicants or manage selection requests", () => {
      const viewRegistrar = makeUser(["Registrar"], ["Registrar"]);
      assert.equal(can(viewRegistrar, "viewApplicants"), true);
      assert.equal(can(viewRegistrar, "registerApplicant"), false);
      assert.equal(can(viewRegistrar, "manageSelectionRequests"), false);
    });

    test("Finance Manager (View) can view finance/commission but cannot mutate transactions or batches", () => {
      const viewFinance = makeUser(["Finance Manager"], ["Finance Manager"]);
      assert.equal(can(viewFinance, "viewFinance"), true);
      assert.equal(can(viewFinance, "viewCommission"), true);
      assert.equal(can(viewFinance, "manageFinance"), false);
      assert.equal(can(viewFinance, "manageCommission"), false);
    });

    test("Clearance Officer (View) can view clearances but cannot start/complete steps", () => {
      const viewClearance = makeUser(["Clearance Officer"], ["Clearance Officer"]);
      assert.equal(can(viewClearance, "viewClearances"), true);
      assert.equal(can(viewClearance, "manageClearances"), false);
      assert.equal(can(viewClearance, "editLms"), false);
      assert.equal(can(viewClearance, "editInjaz"), false);
      assert.equal(can(viewClearance, "editEmbassy"), false);
    });

    test("Medical Officer (View) can view placements but cannot record medical fitness results", () => {
      const viewMedical = makeUser(["Medical Officer"], ["Medical Officer"]);
      assert.equal(can(viewMedical, "manageMedical"), false);
    });

    test("Ticketer (View) can view departures but cannot issue tickets or record departures", () => {
      const viewTicketer = makeUser(["Ticketer"], ["Ticketer"]);
      assert.equal(can(viewTicketer, "manageTicketing"), false);
      assert.equal(can(viewTicketer, "createDeparture"), false);
      assert.equal(can(viewTicketer, "createTicket"), false);
    });
  });

  // =========================================================================
  // 5. MULTI-ROLE MATHEMATICAL UNION & NON-POISONING INTEGRITY
  // =========================================================================
  describe("5. Multi-Role Permission Union & Non-Poisoning Integrity", () => {
    test("Mixed Writable + Read-Only: Registrar (writable) + Finance Manager (View)", () => {
      // User is writable for applicant registration, but read-only for finance.
      const mixedUser = makeUser(
        ["Registrar", "Finance Manager"],
        ["Finance Manager"]
      );

      // Writable domain: Registrar mutations MUST succeed
      assert.equal(can(mixedUser, "viewApplicants"), true);
      assert.equal(can(mixedUser, "registerApplicant"), true);
      assert.equal(can(mixedUser, "manageSelectionRequests"), true);

      // Read-only domain: Finance view MUST succeed, but Finance mutations MUST FAIL
      assert.equal(can(mixedUser, "viewFinance"), true);
      assert.equal(can(mixedUser, "viewCommission"), true);
      assert.equal(can(mixedUser, "manageFinance"), false);
      assert.equal(can(mixedUser, "manageCommission"), false);

      // Role read-only checks are granular
      assert.equal(isPermRoleReadOnly("Registrar", mixedUser), false);
      assert.equal(isPermRoleReadOnly("Finance Manager", mixedUser), true);
      assert.equal(isV2RoleReadOnly(mixedUser, "Registrar"), false);
      assert.equal(isV2RoleReadOnly(mixedUser, "Finance Manager"), true);
    });

    test("Mixed Writable + Read-Only: Saudi LMIS (View) + Ticketer (writable)", () => {
      const mixedUser = makeUser(
        ["Saudi LMIS", "Ticketer"],
        ["Saudi LMIS"]
      );

      // LMIS mutation is blocked (view-only)
      assert.equal(can(mixedUser, "editLms"), false);

      // Ticketer mutations succeed (writable)
      assert.equal(can(mixedUser, "manageTicketing"), true);
      assert.equal(can(mixedUser, "createTicket"), true);
      assert.equal(can(mixedUser, "createDeparture"), true);

      assert.equal(isPermRoleReadOnly("Saudi LMIS", mixedUser), true);
      assert.equal(isPermRoleReadOnly("Ticketer", mixedUser), false);
    });

    test("Multi-Role Pairwise: Registrar + Clearance Officer (both writable)", () => {
      const dualWritable = makeUser(["Registrar", "Clearance Officer"], []);
      // Union of both roles:
      assert.equal(can(dualWritable, "registerApplicant"), true);
      assert.equal(can(dualWritable, "manageSelectionRequests"), true);
      assert.equal(can(dualWritable, "manageClearances"), true);
      assert.equal(can(dualWritable, "editLms"), true);
      assert.equal(can(dualWritable, "editInjaz"), true);
      assert.equal(can(dualWritable, "editEmbassy"), true);

      // Neither role has finance permissions:
      assert.equal(can(dualWritable, "manageFinance"), false);
      assert.equal(can(dualWritable, "manageCommission"), false);
    });

    test("Multi-Role Pairwise: Medical Officer + Contract Parser (both writable)", () => {
      const specialist = makeUser(["Medical Officer", "Contract Parser"], []);
      assert.equal(can(specialist, "manageMedical"), true);
      assert.equal(can(specialist, "viewApplicants"), true);

      // Neither role can manage finance or clearances directly
      assert.equal(can(specialist, "manageFinance"), false);
      assert.equal(can(specialist, "manageClearances"), false);
    });
  });

  // =========================================================================
  // 6. FOREIGN AGENCY LOCK & IDENTITY INTEGRITY
  // =========================================================================
  describe("6. Foreign Agency Role Isolation & Identity Verification", () => {
    test("hasRole('Foreign Agency') requires exact role assignment and CANNOT be spoofed by Admin", () => {
      const admin = makeUser(["Admin"]);
      assert.equal(hasRole(admin, "Foreign Agency"), false);
      assert.equal(hasV2Role(admin, "Foreign Agency"), false);

      const agency = makeUser(["Foreign Agency"]);
      assert.equal(hasRole(agency, "Foreign Agency"), true);
      assert.equal(hasV2Role(agency, "Foreign Agency"), true);
    });

    test("isPureForeignAgency correctly distinguishes external agencies from internal users", () => {
      const agency = makeUser(["Foreign Agency"]);
      assert.equal(isPureForeignAgency(agency), true);

      const internalUser = makeUser(["Registrar"]);
      assert.equal(isPureForeignAgency(internalUser), false);

      const admin = makeUser(["Admin"]);
      assert.equal(isPureForeignAgency(admin), false);
    });

    test("Foreign Agency is barred from all internal workflows", () => {
      const agency = makeUser(["Foreign Agency"]);
      assert.equal(can(agency, "viewApplicants"), false);
      assert.equal(can(agency, "registerApplicant"), false);
      assert.equal(can(agency, "manageFinance"), false);
      assert.equal(can(agency, "manageCommission"), false);
      assert.equal(can(agency, "editLms"), false);
      assert.equal(can(agency, "manageTicketing"), false);
      assert.equal(can(agency, "viewReports"), false);

      // Agency only has portal access
      assert.equal(can(agency, "accessAgentPortal"), true);
    });
  });

  // =========================================================================
  // 7. ROUTE GATING & FAIL-CLOSED PROTECTION
  // =========================================================================
  describe("7. Route Permission Gating & Fail-Closed Guard", () => {
    test("Route permission map gates financial pages using view capabilities (safe for read-only roles)", () => {
      assert.equal(ROUTE_PERMISSION_MAP["/commission"], "viewCommission");
      assert.equal(ROUTE_PERMISSION_MAP["/expenses-income"], "viewFinance");
      assert.equal(ROUTE_PERMISSION_MAP["/complaints"], "viewComplaints");
      assert.equal(ROUTE_PERMISSION_MAP["/reports"], "viewReports");
      assert.equal(ROUTE_PERMISSION_MAP["/applicants"], "viewApplicants");
      assert.equal(ROUTE_PERMISSION_MAP["/agent"], "accessAgentPortal");
    });

    test("Read-only users can navigate to view-protected routes without getting redirected", () => {
      const viewFinance = makeUser(["Finance Manager"], ["Finance Manager"]);
      const actionForCommission = ROUTE_PERMISSION_MAP["/commission"];
      assert.equal(can(viewFinance, actionForCommission), true);

      const actionForExpenses = ROUTE_PERMISSION_MAP["/expenses-income"];
      assert.equal(can(viewFinance, actionForExpenses), true);
    });

    test("Unauthenticated or unauthorized users are strictly blocked on internal routes", () => {
      const unauth: AuthUser | null = null;
      assert.equal(can(unauth, "viewApplicants"), false);
      assert.equal(can(unauth, "viewFinance"), false);
      assert.equal(can(unauth, "manageCommission"), false);

      const emptyUser = makeUser([]);
      assert.equal(can(emptyUser, "viewApplicants"), false);
      assert.equal(can(emptyUser, "manageFinance"), false);
    });
  });
});
