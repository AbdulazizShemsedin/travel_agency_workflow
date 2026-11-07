/**
 * V2 Corridor Engine API
 * 
 * Endpoints:
 * - POST /api/method/agency_tracking.api.system.read?op=get_corridor_steps
 */

import { requestV2 } from "./client";

/**
 * Registered destination countries with implemented clearance corridor workflows.
 * Baseline registered corridors: Saudi Arabia and Kuwait.
 * Scales dynamically as new country corridor workflows are implemented in the platform.
 */
export const REGISTERED_WORKFLOW_COUNTRIES = [
  "Saudi Arabia",
  "Kuwait",
] as const;

export type RegisteredWorkflowCountry = (typeof REGISTERED_WORKFLOW_COUNTRIES)[number];

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
    "/api/method/agency_tracking.api.system.read?op=get_corridor_steps",
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
