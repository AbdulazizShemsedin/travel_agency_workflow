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

/**
 * Creates/fetches this foreign agency's thread with the Communication Manager.
 * If called by staff, 'contractor' name must be passed to target the specific contractor.
 */
export async function createAgencyThreadV2(contractor?: string): Promise<{ thread_name: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.chat_api.create_agency_thread",
    {
      method: "POST",
      body: contractor ? { contractor } : undefined,
    }
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
  const result = await requestV2<V2ChatThread[] | { threads?: V2ChatThread[] }>(
    "/api/method/agency_tracking.chat_api.list_threads",
    { method: "POST" }
  );

  if (Array.isArray(result)) return result;
  if (result && Array.isArray((result as any).threads)) return (result as any).threads;
  return [];
}

/**
 * Lists all threads across the entire agency for Admin & Communication Manager oversight.
 * Returns each thread enriched with participants, contractor link, and initiator details.
 */
export async function listAllThreadsForOversightV2(): Promise<V2ChatThread[]> {
  const result = await requestV2<V2ChatThread[] | { threads?: V2ChatThread[]; message?: V2ChatThread[] }>(
    "/api/method/agency_tracking.chat_api.list_all_threads",
    { method: "POST" }
  );

  if (Array.isArray(result)) return result;
  if (result && Array.isArray((result as any).threads)) return (result as any).threads;
  if (result && Array.isArray((result as any).message)) return (result as any).message;
  return [];
}

/**
 * Gets all messages in a thread.
 */
export async function getThreadMessagesV2(threadName: string): Promise<V2ChatMessage[]> {
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
