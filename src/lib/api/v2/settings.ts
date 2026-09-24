/**
 * Agency Tracking Settings API (V2)
 *
 * Provides reading and updating of the singleton "Agency Tracking Settings"
 * using native Frappe client RPCs (/api/method/frappe.client.get, /api/method/frappe.client.set_value).
 */

import { requestV2 } from "./client";

export interface V2AgencyTrackingSettings {
  name?: string;
  agency_name?: string;
  agency_email?: string;
  agency_phone?: string;
  bank_name?: string;
  bank_account_no?: string;
  iban?: string;
  license_number?: string;
  stamp?: string;
  urgent_alert_threshold_days?: number;
  warning_alert_threshold_days?: number;
  [key: string]: any;
}

export async function getAgencyTrackingSettingsV2(): Promise<V2AgencyTrackingSettings> {
  try {
    const res = await requestV2<{ message?: V2AgencyTrackingSettings } | V2AgencyTrackingSettings>(
      "/api/method/frappe.client.get",
      {
        method: "POST",
        body: { doctype: "Agency Tracking Settings" },
      }
    );
    return (res as any)?.message || res || {};
  } catch (err) {
    console.warn("Could not load Agency Tracking Settings via frappe.client.get:", err);
    return {};
  }
}

export async function updateAgencyTrackingSettingsV2(
  fields: Partial<V2AgencyTrackingSettings>
): Promise<V2AgencyTrackingSettings> {
  const res = await requestV2<{ message?: V2AgencyTrackingSettings } | V2AgencyTrackingSettings>(
    "/api/method/frappe.client.set_value",
    {
      method: "POST",
      body: {
        doctype: "Agency Tracking Settings",
        name: "Agency Tracking Settings",
        fieldname: fields,
      },
    }
  );
  return (res as any)?.message || res || {};
}
