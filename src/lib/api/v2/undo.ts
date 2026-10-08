import { requestV2 } from "./client";

export type UndoableDocType =
  | "Applicant"
  | "Placement"
  | "Complaint"
  | "Applicant Transaction"
  | "Clearance Step";

export interface UndoableStepInfo {
  available: boolean;
  from_status?: string;
  to_status?: string;
  blocked?: string;
}

export interface ReverseLastStepResult {
  success?: boolean;
  message?: string;
  [key: string]: any;
}

/**
 * Checks whether the specified record has an undoable previous transition.
 */
export async function getUndoableStepV2(
  doctype: UndoableDocType,
  name: string
): Promise<UndoableStepInfo> {
  return requestV2<UndoableStepInfo>(
    "/api/method/agency_tracking.reversal.get_undoable_step",
    {
      method: "POST",
      body: { doctype, name },
    }
  );
}

/**
 * Executes a reversal of the last state transition on the target record.
 * Must include the `from_status` verified from getUndoableStep to guard against concurrent moves.
 */
export async function reverseLastStepV2(
  doctype: UndoableDocType,
  name: string,
  from_status?: string,
  reason?: string
): Promise<ReverseLastStepResult> {
  return requestV2<ReverseLastStepResult>(
    "/api/method/agency_tracking.reversal.reverse_last_step",
    {
      method: "POST",
      body: {
        doctype,
        name,
        from_status,
        reason,
      },
    }
  );
}
