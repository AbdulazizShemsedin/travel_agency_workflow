/**
 * Agency Tracking Settings API (V2)
 *
 * Provides reading and updating of application settings across:
 * - Singleton Frappe Agency Tracking Settings
 * - Cloudflare R2 Storage (settings_api)
 * - Exchange Rates & Currency Conversion (settings_api)
 * - Web Push & WhatsApp Notifications (settings_api)
 * - Corridors & Corridor Fee Schedules (settings_api)
 */

import { requestV2 } from "./client";
import { getCompanySettingsV2, updateCompanySettingsV2 } from "./finance";

// ==========================================
// 1. Frappe Singleton Settings (delegates to get_company_settings / update_company_settings)
// ==========================================

export interface V2AgencyTrackingSettings {
  name?: string;
  agency_name?: string;
  agency_email?: string;
  agency_phone?: string;
  agency_address?: string;
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  bank_address?: string;
  bank_swift_code?: string;
  bank_phone?: string;
  bank_email?: string;
  logo?: string;
  stamp_image?: string;
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
    const res = await getCompanySettingsV2();
    return res || {};
  } catch (err) {
    console.warn("Could not load Agency Tracking Settings via getCompanySettingsV2:", err);
    return {};
  }
}

export async function updateAgencyTrackingSettingsV2(
  fields: Partial<V2AgencyTrackingSettings>
): Promise<V2AgencyTrackingSettings> {
  const res = await updateCompanySettingsV2(fields);
  return res || {};
}

// ==========================================
// 2. Cloudflare R2 Storage Settings
// ==========================================

export interface V2StorageSettings {
  r2_account_id?: string;
  r2_bucket_name?: string;
  r2_public_url_base?: string;
  r2_access_key_id?: string;
  secret_key_set?: boolean;
  configured?: boolean;
  /** Set by the Go backend: R2 comes from the server's environment and cannot be saved here. */
  read_only?: boolean;
  [key: string]: any;
}

export async function getStorageSettingsV2(): Promise<V2StorageSettings> {
  const result = await requestV2<V2StorageSettings | { message: V2StorageSettings }>(
    "/api/method/agency_tracking.api.settings.read?op=get_storage_settings",
    { method: "POST" }
  );
  return (result as any)?.message || result || {};
}

export async function updateStorageSettingsV2(payload: {
  r2_account_id?: string;
  r2_bucket_name?: string;
  r2_public_url_base?: string;
  r2_access_key_id?: string;
  r2_secret_access_key?: string;
}): Promise<V2StorageSettings> {
  const result = await requestV2<V2StorageSettings | { message: V2StorageSettings }>(
    "/api/method/agency_tracking.api.settings.write?op=update_storage_settings",
    {
      method: "POST",
      body: payload,
    }
  );
  return (result as any)?.message || result || {};
}

// ==========================================
// 3. Exchange Rate Settings
// ==========================================

export interface V2ExchangeRateSettings {
  convert_to_birr?: boolean;
  mode?: "Global" | "Custom" | string;
  fetch_interval?: string;
  last_fetched_at?: string;
  allowed_modes?: string[];
  allowed_intervals?: string[];
  currencies?: string[];
  rates?: Record<string, number>;
  [key: string]: any;
}

export async function getExchangeRateSettingsV2(): Promise<V2ExchangeRateSettings> {
  const result = await requestV2<V2ExchangeRateSettings | { message: V2ExchangeRateSettings }>(
    "/api/method/agency_tracking.api.settings.read?op=get_exchange_rate_settings",
    { method: "POST" }
  );
  return (result as any)?.message || result || {};
}

export async function updateExchangeRateSettingsV2(payload: {
  convert_to_birr?: boolean;
  mode?: "Global" | "Custom" | string;
  fetch_interval?: string;
}): Promise<V2ExchangeRateSettings> {
  const result = await requestV2<V2ExchangeRateSettings | { message: V2ExchangeRateSettings }>(
    "/api/method/agency_tracking.api.settings.write?op=update_exchange_rate_settings",
    {
      method: "POST",
      body: payload,
    }
  );
  return (result as any)?.message || result || {};
}

// ==========================================
// 4. Notification Settings
// ==========================================

export interface V2NotificationSettings {
  vapid_public_key?: string;
  vapid_claims_email?: string;
  whatsapp_phone_number_id?: string;
  whatsapp_token_set?: boolean;
  whatsapp_configured?: boolean;
  contract_age_threshold_days?: number;
  [key: string]: any;
}

export async function getNotificationSettingsV2(): Promise<V2NotificationSettings> {
  const result = await requestV2<V2NotificationSettings | { message: V2NotificationSettings }>(
    "/api/method/agency_tracking.api.settings.read?op=get_notification_settings",
    { method: "POST" }
  );
  return (result as any)?.message || result || {};
}

export async function updateNotificationSettingsV2(payload: {
  vapid_claims_email?: string;
  whatsapp_phone_number_id?: string;
  whatsapp_access_token?: string;
  contract_age_threshold_days?: number;
}): Promise<V2NotificationSettings> {
  const result = await requestV2<V2NotificationSettings | { message: V2NotificationSettings }>(
    "/api/method/agency_tracking.api.settings.write?op=update_notification_settings",
    {
      method: "POST",
      body: payload,
    }
  );
  return (result as any)?.message || result || {};
}

// ==========================================
// 5. Corridor & Fee Schedule Settings
// ==========================================

export interface V2CorridorFeeItem {
  fee_type: string;
  step_type: string;
  amount: number;
  currency: string;
}

export interface V2CorridorConfig {
  destination_country: string;
  steps: Array<{
    step_type: string;
    title?: string;
    sequence_index?: number;
    [key: string]: any;
  }>;
  fees?: V2CorridorFeeItem[];
  allowed_fee_types?: string[];
  allowed_currencies?: string[];
  [key: string]: any;
}

export async function listCorridorsV2(): Promise<V2CorridorConfig[]> {
  const result = await requestV2<V2CorridorConfig[] | { message: V2CorridorConfig[] }>(
    "/api/method/agency_tracking.api.system.read?op=list_corridors",
    { method: "POST" }
  );
  if (Array.isArray(result)) return result;
  if (result && Array.isArray((result as any).message)) return (result as any).message;
  return [];
}

export async function updateCorridorFeesV2(
  destination_country: string,
  fees: V2CorridorFeeItem[]
): Promise<{ message?: string; destination_country?: string; fees?: V2CorridorFeeItem[] }> {
  return await requestV2(
    "/api/method/agency_tracking.api.settings.write?op=update_corridor_fees",
    {
      method: "POST",
      body: {
        destination_country,
        fees,
      },
    }
  );
}
