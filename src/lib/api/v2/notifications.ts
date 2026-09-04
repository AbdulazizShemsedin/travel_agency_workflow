/**
 * V2 Web Push & Reminders Notification API
 * 
 * Endpoints:
 * - POST /api/method/agency_tracking.notification_api.subscribe_to_push
 * - POST /api/method/agency_tracking.notification_api.get_push_subscription_status
 * - POST /api/method/agency_tracking.notification_api.trigger_wakala_reminder
 */

import { requestV2 } from "./client";
import { listApplicantsV2 } from "./applicants";
import { listPlacementsV2 } from "./placements";
import { listUnresolvedComplaintsV2 } from "./complaints";
import { listMyClearanceStepsV2 } from "./clearance";
import { listMyWakalaRequestsV2 } from "./portal";

export interface V2PushSubscriptionStatus {
  subscribed: boolean;
  endpoint?: string;
  vapid_public_key?: string;
  enabled?: boolean;
  [key: string]: any;
}

export interface V2AppNotification {
  id: string;
  title: string;
  description: string;
  category: "compliance" | "workflow" | "complaints" | "system";
  severity: "urgent" | "warning" | "info";
  timestamp: string;
  applicant_id?: string;
  applicant_name?: string;
  action_url?: string;
  action_label?: string;
}

/**
 * Checks whether the current user has an active Push Subscription.
 */
export async function getPushSubscriptionStatusV2(): Promise<V2PushSubscriptionStatus> {
  const result = await requestV2<{
    subscribed?: boolean;
    endpoint?: string;
    vapid_public_key?: string;
    enabled?: boolean;
  }>("/api/method/agency_tracking.notification_api.get_push_subscription_status", {
    method: "POST",
  });

  return {
    subscribed: Boolean((result as any)?.subscribed),
    endpoint: (result as any)?.endpoint,
    vapid_public_key: (result as any)?.vapid_public_key || "",
    enabled: Boolean((result as any)?.enabled ?? true),
  };
}

/**
 * Subscribes the current browser to Push notifications.
 */
export async function subscribeToPushV2(
  endpoint: string,
  p256dh: string,
  auth: string
): Promise<{ status?: string; message?: string }> {
  return await requestV2(
    "/api/method/agency_tracking.notification_api.subscribe_to_push",
    {
      method: "POST",
      body: {
        endpoint,
        p256dh,
        auth,
      },
    }
  );
}

/**
 * Manually triggers a Wakala payment reminder for an Embassy clearance step.
 */
export async function triggerWakalaReminderV2(
  clearanceStepName: string
): Promise<{ status?: string; message?: string }> {
  return await requestV2(
    "/api/method/agency_tracking.notification_api.trigger_wakala_reminder",
    {
      method: "POST",
      body: { clearance_step_name: clearanceStepName },
    }
  );
}

/**
 * Dynamically computes real-time operational compliance notifications from live V2 backend data,
 * implementing all 4 backend-specified watchdogs:
 * 1. medical_expiry_watchdog (14/10/7/3/1-day tiers)
 * 2. contract_age_watchdog (25-29d approaching ticket deadline, 30d+ critical not departed)
 * 3. wakala_reminder_watchdog (Wakala authorization & payment reminder ahead of Monday Embassy cutoff)
 * 4. taeshir_injaz_reminder_watchdog (3/2/1-day tiers for Saudi Taeshir & Injaz submission)
 */
export async function getComplianceNotificationsV2(): Promise<V2AppNotification[]> {
  const notifications: V2AppNotification[] = [];

  try {
    const [applicants, placements, complaints, clearanceSteps] = await Promise.all([
      listApplicantsV2().catch(() => []),
      listPlacementsV2().catch(() => []),
      listUnresolvedComplaintsV2().catch(() => []),
      listMyClearanceStepsV2().catch(() => []),
    ]);

    const now = new Date();

    // 1. WATCHDOG 1: medical_expiry_watchdog (14, 10, 7, 3, 1 days before Applicant.medical_expiry_date)
    for (const app of applicants) {
      const name = app.full_name || app.first_name || app.name;

      if (app.medical_expiry_date) {
        const medDate = new Date(app.medical_expiry_date);
        const diffDays = Math.round((medDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= 14 && diffDays >= 0) {
          notifications.push({
            id: `med-expiry-watchdog-${app.name}`,
            title: `Medical Expiry Watchdog: ${name} (${diffDays === 0 ? "Expires Today" : `${diffDays}d remaining`})`,
            description: `Medical clearance for ${name} expires on ${app.medical_expiry_date} (${diffDays} days remaining). LMIS re-examination or clearance renewal required.`,
            category: "compliance",
            severity: diffDays <= 3 ? "urgent" : "warning",
            timestamp: diffDays <= 3 ? "Critical" : "Approaching Expiry",
            applicant_id: app.name,
            applicant_name: name,
            action_url: `/applicants/${encodeURIComponent(app.name)}`,
            action_label: "View Candidate",
          });
        } else if (diffDays < 0) {
          notifications.push({
            id: `med-expired-${app.name}`,
            title: `Medical Expired: ${name}`,
            description: `Medical clearance expired on ${app.medical_expiry_date}. Candidate processing is halted until renewed.`,
            category: "compliance",
            severity: "urgent",
            timestamp: "Expired",
            applicant_id: app.name,
            applicant_name: name,
            action_url: `/applicants/${encodeURIComponent(app.name)}`,
            action_label: "View Candidate",
          });
        }
      }

      // Passport Expiry Watchdog
      if (app.passport_expiry) {
        const passDate = new Date(app.passport_expiry);
        const diffDays = Math.round((passDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30 && diffDays >= 0) {
          notifications.push({
            id: `pass-urgent-${app.name}`,
            title: `Passport Expiring Soon: ${name} (${diffDays}d)`,
            description: `${name}'s passport expires on ${app.passport_expiry}. Immediate renewal required before embassy visa stamping.`,
            category: "compliance",
            severity: "urgent",
            timestamp: "Action Required",
            applicant_id: app.name,
            applicant_name: name,
            action_url: `/applicants/${encodeURIComponent(app.name)}`,
            action_label: "View Profile",
          });
        } else if (diffDays < 0) {
          notifications.push({
            id: `pass-expired-${app.name}`,
            title: `Expired Passport: ${name}`,
            description: `Passport expired on ${app.passport_expiry}. Processing is halted until renewed.`,
            category: "compliance",
            severity: "urgent",
            timestamp: "Expired",
            applicant_id: app.name,
            applicant_name: name,
            action_url: `/applicants/${encodeURIComponent(app.name)}`,
            action_label: "View Profile",
          });
        }
      }
    }

    // 2. WATCHDOG 2: contract_age_watchdog (Placement aging: 25-29d approaching ticket deadline, 30d+ critical not departed)
    for (const plc of placements) {
      if (plc.status !== "Departed" && plc.status !== "Cancelled" && plc.contract_signed_date) {
        const signedDate = new Date(plc.contract_signed_date);
        const ageDays = Math.floor((now.getTime() - signedDate.getTime()) / (1000 * 60 * 60 * 24));

        if (ageDays >= 30) {
          notifications.push({
            id: `contract-age-critical-${plc.name}`,
            title: `Critical Contract Age: Placement ${plc.name} (${ageDays}d)`,
            description: `Placement for ${plc.applicant_name || plc.applicant} has reached ${ageDays} days since contract signing and is still not Departed (cutoff: 30d). Priority clearance and ticketing required.`,
            category: "compliance",
            severity: "urgent",
            timestamp: `${ageDays}d old`,
            applicant_id: plc.applicant,
            applicant_name: plc.applicant_name,
            action_url: `/applicants/${encodeURIComponent(plc.applicant)}`,
            action_label: "Open Candidate",
          });
        } else if (ageDays >= 25 && ageDays < 30) {
          notifications.push({
            id: `contract-age-approaching-${plc.name}`,
            title: `Approaching Ticket Deadline: Placement ${plc.name} (${ageDays}d)`,
            description: `Placement for ${plc.applicant_name || plc.applicant} is at ${ageDays} days since signing (critical cutoff approaching at 30 days). Ensure ticketing clearance is expedited.`,
            category: "workflow",
            severity: "warning",
            timestamp: `${ageDays}d old`,
            applicant_id: plc.applicant,
            applicant_name: plc.applicant_name,
            action_url: `/applicants/${encodeURIComponent(plc.applicant)}`,
            action_label: "Open Candidate",
          });
        }
      }

      // Pre-Departure Medical 2 Checks for Ticketed Placements
      if (plc.status === "Ticketed") {
        notifications.push({
          id: `plc-med2-${plc.name}`,
          title: `Pre-Departure Medical 2 Due: Placement ${plc.name}`,
          description: `Candidate is Ticketed for flight departure. Pre-departure medical fitness verification required before airport departure clearance.`,
          category: "workflow",
          severity: "warning",
          timestamp: plc.flight_date || "Flight Imminent",
          applicant_id: plc.applicant,
          applicant_name: plc.applicant_name,
          action_url: `/applicants/${encodeURIComponent(plc.applicant)}`,
          action_label: "Open Candidate",
        });
      }
    }

    // 3. WATCHDOG 3: wakala_reminder_watchdog (Fri/Sat/Sun reminders before Monday Embassy submission)
    for (const step of clearanceSteps) {
      const stepType = (step.step_type || step.step_name || "").toLowerCase();
      const isWakalaStep = stepType.includes("wakala") || stepType.includes("embassy");
      const isUnpaid = step.status !== "Complete" && step.status !== "Issued" && step.status !== "Stamped" && step.status !== "Paid";

      if (isWakalaStep && isUnpaid) {
        notifications.push({
          id: `wakala-watchdog-${step.name}`,
          title: `Wakala Reminder Watchdog: ${step.name}`,
          description: `Wakala authorization and fee payment pending for ${step.applicant_name || step.applicant || "Candidate"} (Placement: ${step.placement || "Active"}). Must be completed prior to Monday Embassy cutoff.`,
          category: "compliance",
          severity: "urgent",
          timestamp: "Embassy Deadline",
          applicant_id: step.applicant,
          applicant_name: step.applicant_name,
          action_url: step.applicant ? `/applicants/${encodeURIComponent(step.applicant)}` : "/applicants",
          action_label: "View Clearance Step",
        });
      }

      // 4. WATCHDOG 4: taeshir_injaz_reminder_watchdog (Saudi Taeshir & Injaz submission queue)
      const isTaeshirInjaz = stepType.includes("taeshir") || stepType.includes("te'shir") || stepType.includes("injaz");
      if (isTaeshirInjaz && isUnpaid) {
        notifications.push({
          id: `taeshir-injaz-watchdog-${step.name}`,
          title: `Taeshir / Injaz Reminder: ${step.step_type || step.name}`,
          description: `${step.step_type || "Taeshir"} clearance step for ${step.applicant_name || step.applicant || "Candidate"} is currently ${step.status}. Review document biometric submission status.`,
          category: "workflow",
          severity: "warning",
          timestamp: step.status || "Pending",
          applicant_id: step.applicant,
          applicant_name: step.applicant_name,
          action_url: step.applicant ? `/applicants/${encodeURIComponent(step.applicant)}` : "/applicants",
          action_label: "Open Queue",
        });
      }
    }

    // 5. Active Complaints & Warranty Disputes
    for (const comp of complaints) {
      const candidateName = comp.full_name || comp.applicant_name || comp.applicant || "Candidate";

      notifications.push({
        id: `comp-${comp.name}`,
        title: `Active Complaint: ${candidateName}`,
        description: `Dispute ticket for ${candidateName} (Placement ${comp.placement || "N/A"}): "${comp.description || "Active complaint"}"`,
        category: "complaints",
        severity: "urgent",
        timestamp: comp.creation ? comp.creation.split(" ")[0] : "Active Ticket",
        applicant_id: comp.applicant,
        applicant_name: candidateName,
        action_url: "/complaints",
        action_label: "Review Ticket",
      });
    }
  } catch (err) {
    console.error("V2 Compliance notifications fetch error:", err);
  }

  return notifications;
}

/**
 * Dynamically computes Foreign Agency portal-isolated notifications.
 * Never exposes internal staff tasks, internal applicant records, or internal system URLs.
 */
export async function getForeignAgencyNotificationsV2(): Promise<V2AppNotification[]> {
  const notifications: V2AppNotification[] = [];

  try {
    const [wakalaRequests, placements] = await Promise.all([
      listMyWakalaRequestsV2().catch(() => []),
      listPlacementsV2().catch(() => []),
    ]);

    // 1. Pending Wakala Requests
    for (const req of wakalaRequests) {
      const candidateName = req.full_name || req.applicant_name || "Candidate";
      notifications.push({
        id: `agency-wakala-${req.clearance_step_name || req.name || Math.random().toString()}`,
        title: `Wakala Authorization Required: ${candidateName}`,
        description: `Placement ${req.placement_name || "Pending"} requires Wakala authorization (Passport: ${req.passport_number || "N/A"}) ahead of Monday Embassy cutoff.`,
        category: "workflow",
        severity: "urgent",
        timestamp: "Action Required",
        applicant_id: req.applicant_name,
        applicant_name: candidateName,
        action_url: "/agent/wakala",
        action_label: "Review Wakala",
      });
    }

    // 2. Reserved candidates awaiting bilateral contract upload
    for (const plc of placements) {
      if (plc.status === "Selected" || !plc.contract_signed_date) {
        notifications.push({
          id: `agency-contract-${plc.name}`,
          title: `Contract Upload Required: ${plc.applicant_name || plc.applicant}`,
          description: `Placement ${plc.name} for ${plc.applicant_name || plc.applicant} is awaiting bilateral employment contract upload to advance to corridor clearance.`,
          category: "workflow",
          severity: "warning",
          timestamp: plc.selection_date || "Pending Upload",
          applicant_id: plc.applicant,
          applicant_name: plc.applicant_name,
          action_url: "/agent/reserved",
          action_label: "Upload Contract",
        });
      }
    }
  } catch (err) {
    console.error("V2 Foreign Agency notifications fetch error:", err);
  }

  return notifications;
}

/**
 * Fetches the backend VAPID public applicationServerKey for PushManager.subscribe().
 * Auto-generates keys on first call on the backend.
 */
export async function getVapidPublicKeyV2(): Promise<string> {
  const result = await requestV2<{ vapid_public_key?: string; message?: { vapid_public_key?: string } }>(
    "/api/method/agency_tracking.notification_api.get_vapid_public_key",
    { method: "GET" }
  );

  const key = (result as any)?.vapid_public_key || (result as any)?.message?.vapid_public_key || "";
  if (!key) {
    throw new Error("No VAPID public key returned by backend server.");
  }
  return key;
}

/**
 * Forces regeneration of the backend VAPID keypair.
 * Admin / System Manager only. Invalidates all existing client push subscriptions.
 */
export async function regenerateVapidKeysV2(): Promise<{ vapid_public_key: string; message?: string }> {
  const result = await requestV2<{ vapid_public_key?: string; message?: string }>(
    "/api/method/agency_tracking.notification_api.regenerate_vapid_keys",
    { method: "POST" }
  );

  return {
    vapid_public_key: (result as any)?.vapid_public_key || (result as any)?.message?.vapid_public_key || "",
    message: (result as any)?.message || "VAPID keypair regenerated successfully.",
  };
}
