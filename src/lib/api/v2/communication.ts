/**
 * V2 Chat & Messaging API
 * 
 * Endpoints:
 * - POST /api/method/agency_tracking.chat_api.create_agency_thread
 * - POST /api/method/agency_tracking.chat_api.create_internal_thread
 * - POST /api/method/agency_tracking.chat_api.list_threads
 * - POST /api/method/agency_tracking.chat_api.get_thread_messages
 * - POST /api/method/agency_tracking.chat_api.send_message
 * - POST /api/method/agency_tracking.chat_api.mark_read
 * - POST /api/method/agency_tracking.chat_api.add_participant
 */

import { requestV2 } from "./client";
import { isDemoMode } from "@/lib/config/env";

export interface V2ChatThread {
  name: string;
  thread_type?: "Agency" | "Internal" | string;
  title?: string;
  participants?: string[];
  unread_count?: number;
  last_message?: string;
  last_message_time?: string;
  context_type?: string;
  context_reference?: string;
  [key: string]: any;
}

export interface V2ChatMessage {
  name: string;
  sender: string;
  sender_name?: string;
  message?: string;
  attachment?: string;
  mentioned_applicant?: string;
  mentioned_placement?: string;
  creation?: string;
  is_read?: boolean;
  [key: string]: any;
}

const DEMO_THREADS: V2ChatThread[] = [
  {
    name: "THREAD-001",
    thread_type: "Agency",
    title: "Riyadh Manpower Agency - Wakala Coordination",
    participants: ["agency_partner@riyadhmanpower.sa", "comms_manager@agency.com"],
    unread_count: 0,
    last_message: "Wakala authorization completed on Enjaz platform.",
    last_message_time: "2026-02-28 11:30:00",
    context_type: "Placement",
    context_reference: "PLC-2026-0002",
  },
  {
    name: "THREAD-002",
    thread_type: "Internal",
    title: "Embassy Liaison Urgent Stamping Group",
    participants: ["officer_saudi_embassy@agency.com", "ops_admin@agency.com"],
    unread_count: 1,
    last_message: "Embassy batch for 14 candidates submitted successfully.",
    last_message_time: "2026-02-28 09:45:00",
    context_type: "General",
  },
];

const DEMO_MESSAGES: V2ChatMessage[] = [
  {
    name: "MSG-001",
    sender: "agency_partner@riyadhmanpower.sa",
    sender_name: "Ahmed Al-Harbi (Riyadh Manpower)",
    message: "We have finalized selection for candidate Fatima Zahra Ahmed.",
    creation: "2026-02-28 10:15:00",
    is_read: true,
  },
  {
    name: "MSG-002",
    sender: "comms_manager@agency.com",
    sender_name: "Communications Desk",
    message: "Thank you. Medical stage 1 passed FIT and Taeshir appointment is booked.",
    creation: "2026-02-28 11:30:00",
    is_read: true,
  },
];

/**
 * Creates/fetches this foreign agency's thread with the Communication Manager.
 */
export async function createAgencyThreadV2(): Promise<{ thread_name: string; [key: string]: any }> {
  if (isDemoMode()) {
    return { thread_name: "THREAD-001", status: "Success" };
  }

  return requestV2(
    "/api/method/agency_tracking.chat_api.create_agency_thread",
    { method: "POST" }
  );
}

/**
 * Creates/fetches an internal staff-to-staff thread.
 */
export async function createInternalThreadV2(
  otherUserEmail: string,
  contextType: string = "General",
  contextReference?: string
): Promise<{ thread_name: string; [key: string]: any }> {
  if (isDemoMode()) {
    return { thread_name: "THREAD-002", status: "Success" };
  }

  return requestV2(
    "/api/method/agency_tracking.chat_api.create_internal_thread",
    {
      method: "POST",
      body: {
        other_user: otherUserEmail,
        context_type: contextType,
        ...(contextReference ? { context_reference: contextReference } : {}),
      },
    }
  );
}

/**
 * Lists the current user's threads.
 */
export async function listThreadsV2(): Promise<V2ChatThread[]> {
  if (isDemoMode()) {
    return [...DEMO_THREADS];
  }

  const result = await requestV2<V2ChatThread[] | { threads?: V2ChatThread[] }>(
    "/api/method/agency_tracking.chat_api.list_threads",
    { method: "POST" }
  );

  if (Array.isArray(result)) return result;
  if (result && Array.isArray((result as any).threads)) return (result as any).threads;
  return [];
}

/**
 * Gets all messages in a thread.
 */
export async function getThreadMessagesV2(threadName: string): Promise<V2ChatMessage[]> {
  if (isDemoMode()) {
    return [...DEMO_MESSAGES];
  }

  const result = await requestV2<V2ChatMessage[] | { messages?: V2ChatMessage[] }>(
    "/api/method/agency_tracking.chat_api.get_thread_messages",
    {
      method: "POST",
      body: { thread_name: threadName },
    }
  );

  if (Array.isArray(result)) return result;
  if (result && Array.isArray((result as any).messages)) return (result as any).messages;
  return [];
}

/**
 * Sends a message in a thread.
 */
export async function sendMessageV2(
  threadName: string,
  message?: string,
  mentionedApplicant?: string,
  mentionedPlacement?: string,
  attachmentFileUrl?: string
): Promise<{ name?: string; message?: string; [key: string]: any }> {
  if (isDemoMode()) {
    return {
      name: `MSG-${Date.now().toString().slice(-6)}`,
      message: message || "Message sent successfully",
      status: "Success",
    };
  }

  return requestV2(
    "/api/method/agency_tracking.chat_api.send_message",
    {
      method: "POST",
      body: {
        thread_name: threadName,
        ...(message ? { message } : {}),
        ...(mentionedApplicant ? { mentioned_applicant: mentionedApplicant } : {}),
        ...(mentionedPlacement ? { mentioned_placement: mentionedPlacement } : {}),
        ...(attachmentFileUrl ? { attachment: attachmentFileUrl } : {}),
      },
    }
  );
}

/**
 * Marks a thread as read.
 */
export async function markReadV2(threadName: string): Promise<{ message?: string; [key: string]: any }> {
  if (isDemoMode()) {
    return { message: "Thread marked as read", status: "Success" };
  }

  return requestV2(
    "/api/method/agency_tracking.chat_api.mark_read",
    {
      method: "POST",
      body: { thread_name: threadName },
    }
  );
}

/**
 * Adds a participant to an internal thread.
 */
export async function addParticipantV2(
  threadName: string,
  userEmail: string
): Promise<{ message?: string; [key: string]: any }> {
  if (isDemoMode()) {
    return { message: `Participant ${userEmail} added`, status: "Success" };
  }

  return requestV2(
    "/api/method/agency_tracking.chat_api.add_participant",
    {
      method: "POST",
      body: {
        thread_name: threadName,
        user: userEmail,
      },
    }
  );
}
