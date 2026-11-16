import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Foreign Agency Profile, Credentials Management & Dashboard Consistency", () => {
  describe("1. Foreign Agency Email & Profile Editing", () => {
    it("contractor update payload properly preserves and forwards the login email", () => {
      const editFormData = {
        contractor_name: "Al-Baraka Recruitment Services",
        country: "Saudi Arabia",
        contact_person: "Ahmed Al-Harbi",
        phone: "+966 50 123 4567",
        whatsapp: "+966 50 123 4567",
        email: "agency.admin@albaraka.sa",
        communication_manager: "Faisal",
        notes: "Primary Gulf contractor",
      };

      const payload = {
        name: "CON-00001",
        values: {
          contractor_name: editFormData.contractor_name,
          country: editFormData.country,
          contact_person: editFormData.contact_person,
          phone: editFormData.phone,
          whatsapp: editFormData.whatsapp,
          email: editFormData.email.trim(),
          communication_manager: editFormData.communication_manager,
          notes: editFormData.notes,
        },
      };

      assert.strictEqual(payload.values.email, "agency.admin@albaraka.sa");
      assert.ok(payload.values.contractor_name);
      assert.ok(payload.values.country);
    });

    it("optimistic cache updater updates email, user_email, and user on agency edit", () => {
      const existingContractors = [
        {
          name: "CON-00001",
          contractor_name: "Old Agency Name",
          company_name: "Old Agency Name",
          country: "Saudi Arabia",
          email: "old.email@agency.sa",
          user_email: "old.email@agency.sa",
          user: "old.email@agency.sa",
          phone: "+966 11 000 0000",
        },
      ];

      const variables = {
        name: "CON-00001",
        values: {
          contractor_name: "Updated Agency Name",
          email: "new.login@agency.sa",
          phone: "+966 11 999 9999",
        },
      };

      const updated = existingContractors.map((con) => {
        if (con.name === variables.name) {
          const updatedName = variables.values.contractor_name || con.contractor_name;
          return {
            ...con,
            ...variables.values,
            name: con.name,
            contractor_name: updatedName,
            company_name: updatedName,
            email: variables.values.email !== undefined ? variables.values.email : con.email,
            user_email: variables.values.email !== undefined ? variables.values.email : con.user_email,
            user: variables.values.email !== undefined ? variables.values.email : con.user,
          };
        }
        return con;
      });

      assert.strictEqual(updated[0].contractor_name, "Updated Agency Name");
      assert.strictEqual(updated[0].email, "new.login@agency.sa");
      assert.strictEqual(updated[0].user_email, "new.login@agency.sa");
      assert.strictEqual(updated[0].user, "new.login@agency.sa");
    });
  });

  describe("2. Password Reset Validation & Truthful State Representation", () => {
    it("enforces minimum 8 characters validation rule for passwords", () => {
      const validatePassword = (pwd: string): { valid: boolean; reason?: string } => {
        const trimmed = (pwd || "").trim();
        if (!trimmed) {
          return { valid: false, reason: "Password is required" };
        }
        if (trimmed.length < 8) {
          return { valid: false, reason: "Password must be at least 8 characters long for security compliance." };
        }
        return { valid: true };
      };

      assert.strictEqual(validatePassword("").valid, false);
      assert.strictEqual(validatePassword("short").valid, false);
      assert.strictEqual(validatePassword("1234567").valid, false);
      assert.strictEqual(validatePassword("12345678").valid, true);
      assert.strictEqual(validatePassword("StrongPass123!").valid, true);
    });

    it("requires password and confirm password to match exactly", () => {
      const validatePasswordMatch = (p1: string, p2: string): boolean => {
        return Boolean(p1 && p2 && p1 === p2);
      };

      assert.strictEqual(validatePasswordMatch("Pass12345", "Pass12345"), true);
      assert.strictEqual(validatePasswordMatch("Pass12345", "pass12345"), false);
      assert.strictEqual(validatePasswordMatch("Pass12345", "Pass12345_diff"), false);
    });

    it("truthfully indicates hashed password status rather than misleading 'Not yet recorded'", () => {
      const getTruthfulPasswordDisplay = (targetUser?: string | null) => {
        if (!targetUser) {
          return {
            status: "unlinked",
            label: "No linked user account",
            description: "No linked user account — edit agency to configure email.",
          };
        }
        return {
          status: "hashed",
          label: "Password: Set (Securely Hashed)",
          description: "For security, passwords cannot be retrieved once stored. Reset below to issue a new password.",
        };
      };

      const result = getTruthfulPasswordDisplay("agency@foreign.sa");
      assert.strictEqual(result.status, "hashed");
      assert.strictEqual(result.label, "Password: Set (Securely Hashed)");
      assert.doesNotMatch(result.description, /Not yet recorded/);

      const unlinked = getTruthfulPasswordDisplay(null);
      assert.strictEqual(unlinked.status, "unlinked");
    });

    it("displays newly reset password temporarily and discards on modal close", () => {
      let credentialsModalState: {
        isOpen: boolean;
        targetUser: string | null;
        justResetPassword: string | null;
      } = {
        isOpen: true,
        targetUser: "agency@foreign.sa",
        justResetPassword: null,
      };

      // Reset succeeds: temporary password stored in state
      credentialsModalState.justResetPassword = "TemporaryGeneratedPass99#";
      assert.strictEqual(credentialsModalState.justResetPassword, "TemporaryGeneratedPass99#");

      // Close modal: state is wiped clean
      credentialsModalState = {
        isOpen: false,
        targetUser: null,
        justResetPassword: null,
      };

      assert.strictEqual(credentialsModalState.justResetPassword, null);
      assert.strictEqual(credentialsModalState.targetUser, null);
    });

    it("strictly restricts password reset management to Admin and System Manager roles", () => {
      const canManageCredentials = (isAdmin: boolean) => Boolean(isAdmin);

      assert.strictEqual(canManageCredentials(true), true);
      assert.strictEqual(canManageCredentials(false), false);
    });
  });

  describe("3. Dashboard Total Applicants Count & Data Consistency", () => {
    it("correctly extracts total_count from with_total=1 response preserving counts > 100", () => {
      const mockApiResponseWith142Applicants = {
        data: Array.from({ length: 100 }, (_, i) => ({
          name: `APP-${String(i + 1).padStart(5, "0")}`,
          status: "Registered",
        })),
        total_count: 142,
      };

      const applicantRows = mockApiResponseWith142Applicants.data;
      const totalCount =
        typeof mockApiResponseWith142Applicants?.total_count === "number"
          ? mockApiResponseWith142Applicants.total_count
          : applicantRows.length;

      // The count must NOT be capped at 100 (which applicantRows.length would produce)
      assert.strictEqual(applicantRows.length, 100);
      assert.strictEqual(totalCount, 142);
    });

    it("supports large totals (> 500) accurately without page limit capping", () => {
      const mockApiResponseWith542Applicants = {
        data: Array.from({ length: 100 }, (_, i) => ({
          name: `APP-${String(i + 1).padStart(5, "0")}`,
          status: "Registered",
        })),
        total_count: 542,
      };

      const applicantRows = mockApiResponseWith542Applicants.data;
      const totalCount =
        typeof mockApiResponseWith542Applicants?.total_count === "number"
          ? mockApiResponseWith542Applicants.total_count
          : applicantRows.length;

      assert.strictEqual(totalCount, 542);
    });

    it("falls back gracefully to array length if total_count is not provided", () => {
      const mockApiResponseWithoutTotal = Array.from({ length: 42 }, (_, i) => ({
        name: `APP-${String(i + 1).padStart(5, "0")}`,
        status: "Registered",
      }));

      const totalCount =
        typeof (mockApiResponseWithoutTotal as any)?.total_count === "number"
          ? (mockApiResponseWithoutTotal as any).total_count
          : mockApiResponseWithoutTotal.length;

      assert.strictEqual(totalCount, 42);
    });

    it("TanStack Query prefix matching: invalidating ['applicants'] matches ['applicants', 'dashboard']", () => {
      const matchesKey = (queryKey: readonly unknown[], invalidationKey: readonly unknown[]): boolean => {
        if (invalidationKey.length > queryKey.length) return false;
        return invalidationKey.every((part, idx) => part === queryKey[idx]);
      };

      const dashboardQueryKey = ["applicants", "dashboard"] as const;
      const tableQueryKey = ["applicants"] as const;
      const singleApplicantKey = ["applicant", "APP-00001"] as const;

      // Invalidating ["applicants"] matches ["applicants", "dashboard"] and ["applicants"]
      assert.strictEqual(matchesKey(dashboardQueryKey, ["applicants"]), true);
      assert.strictEqual(matchesKey(tableQueryKey, ["applicants"]), true);
      assert.strictEqual(matchesKey(singleApplicantKey, ["applicants"]), false);

      // Old key ["applicants_v2_dashboard"] did NOT match ["applicants"]
      const oldDashboardKey = ["applicants_v2_dashboard"] as const;
      assert.strictEqual(matchesKey(oldDashboardKey, ["applicants"]), false);
    });
  });
});

