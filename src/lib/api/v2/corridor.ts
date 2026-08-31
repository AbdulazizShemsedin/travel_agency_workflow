/**
 * V2 Corridor Engine API
 * 
 * Endpoints:
 * - POST /api/method/agency_tracking.corridor_engine.get_corridor_steps
 */

import { requestV2 } from "./client";
import { isDemoMode } from "@/lib/config/env";

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
  if (isDemoMode()) {
    const dest = (destinationCountry || "").toLowerCase().trim();
    if (dest.includes("kuwait")) {
      return [
        { step_name: "Kuwait LMIS Clearance", step_type: "Kuwait LMIS", sequence: 1, required_role: "Kuwait LMIS Officer", sla_days: 5, description: "Public Authority for Manpower work permit approval" },
        { step_name: "Telesign Clearance", step_type: "Telesign", sequence: 2, required_role: "Kuwait Telesign Officer", sla_days: 4, description: "Security background validation" },
        { step_name: "Kuwait Embassy Endorsement", step_type: "Kuwait Embassy", sequence: 3, required_role: "Kuwait Embassy Officer", sla_days: 3, description: "Visa passport endorsement" },
      ];
    }

    return [
      { step_name: "LMIS Labor Clearance", step_type: "LMIS Clearance", sequence: 1, required_role: "Saudi LMIS Officer", sla_days: 5, description: "Ministry of Labor work permit clearance and COC approval" },
      { step_name: "Taeshir Biometrics", step_type: "Taeshir", sequence: 2, required_role: "Saudi Taeshir Officer", sla_days: 4, description: "Biometric appointment and MOFA visa fee processing" },
      { step_name: "Saudi Embassy Visa Stamping", step_type: "Embassy", sequence: 3, required_role: "Saudi Embassy Officer", sla_days: 3, description: "Consular visa stamping on passport" },
    ];
  }

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
