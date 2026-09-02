/**
 * V2 Corridor Engine API
 * 
 * Endpoints:
 * - POST /api/method/agency_tracking.corridor_engine.get_corridor_steps
 */

import { requestV2 } from "./client";

export interface V2CorridorStepDefinition {
  step_name: string;
  step_type: string;
  sequence?: number;
  required_role?: string;
  sla_days?: number;
  description?: string;
  [key: string]: any;
}

export interface V2CorridorStepsResponse {
  destination_country: string;
  steps: V2CorridorStepDefinition[];
  [key: string]: any;
}

/**
 * Fetches ordered step definitions for a destination country's corridor dynamically from backend.
 */
export async function getCorridorStepsV2(
  destinationCountry: string
): Promise<V2CorridorStepDefinition[]> {
  const result = await requestV2<V2CorridorStepsResponse | V2CorridorStepDefinition[]>(
    "/api/method/agency_tracking.corridor_engine.get_corridor_steps",
    {
      method: "POST",
      body: { destination_country: destinationCountry },
    }
  );

  if (Array.isArray(result)) {
    return result;
  }
  if (result && Array.isArray((result as any).steps)) {
    return (result as any).steps;
  }
  return [];
}
