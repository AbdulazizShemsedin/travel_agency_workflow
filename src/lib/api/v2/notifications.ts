/**
 * V2 Web Push & Reminders Notification API
 * 
 * Endpoints:
 * - POST /api/method/agency_tracking.notification_api.subscribe_to_push
 * - POST /api/method/agency_tracking.notification_api.get_push_subscription_status
 * - POST /api/method/agency_tracking.notification_api.trigger_wakala_reminder
 */

import { requestV2 } from "./client";

export interface V2PushSubscriptionStatus {
  subscribed: boolean;
  endpoint?: string;
  [key: string]: any;
}

/**
 * Checks whether the current user has an active Push Subscription.
 */
export async function getPushSubscriptionStatusV2(): Promise<V2PushSubscriptionStatus> {
  const result = await requestV2<V2PushSubscriptionStatus | { subscribed?: boolean }>(
    "/api/method/agency_tracking.notification_api.get_push_subscription_status",
    { method: "POST" }
  );

  return {
    subscribed: Boolean((result as any)?.subscribed),
    endpoint: (result as any)?.endpoint,
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
  return requestV2(
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
  return requestV2(
    "/api/method/agency_tracking.notification_api.trigger_wakala_reminder",
    {
      method: "POST",
      body: { clearance_step_name: clearanceStepName },
    }
  );
}
