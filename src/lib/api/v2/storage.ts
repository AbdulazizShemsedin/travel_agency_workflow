/**
 * V2 Storage Engine Diagnostics API
 * 
 * Endpoints:
 * - POST /api/method/agency_tracking.storage_engine.test_storage_connection
 */

import { requestV2 } from "./client";

export interface V2StorageConnectionStatus {
  status: "success" | "error" | string;
  bucket?: string;
  public_url_base?: string;
  message: string;
}

/**
 * Tests R2 credentials and bucket readiness via write/delete probe.
 * Admin / System Manager only.
 */
export async function testStorageConnectionV2(): Promise<V2StorageConnectionStatus> {
  const result = await requestV2<V2StorageConnectionStatus | { message: V2StorageConnectionStatus }>(
    "/api/method/agency_tracking.storage_engine.test_storage_connection",
    {
      method: "POST",
      body: {},
    }
  );

  const payload = (result as any)?.message || result;
  return {
    status: payload?.status || "error",
    bucket: payload?.bucket,
    public_url_base: payload?.public_url_base,
    message: payload?.message || "Storage connection test executed.",
  };
}
