"use client";

import { Centrifuge, type PublicationContext } from "centrifuge";
import { requestV2 } from "@/lib/api/v2/client";

/**
 * Live chat updates over Centrifugo.
 *
 * Chat stays in the backend; Centrifugo only tells an open browser that one of its threads
 * changed, so the screen refetches. The backend signs a token naming the user's own channel and
 * Centrifugo subscribes the browser to it, so nothing here chooses a channel. When the backend has
 * Centrifugo off (`enabled: false`), or the socket is down, nothing connects and the chat screen
 * keeps polling as before.
 */

export interface RealtimeEvent {
  /** "reconnected": pushes may have been missed while the socket was down; refetch everything. */
  type?: "message" | "message_deleted" | "read" | "reconnected" | string;
  thread?: string;
  [key: string]: unknown;
}

interface TokenAnswer {
  enabled?: boolean;
  url?: string;
  token?: string;
  expires_in?: number;
}

type Listener = (event: RealtimeEvent) => void;
type StateListener = (connected: boolean) => void;

const TOKEN_URL = "/api/method/agency_tracking.api.auth.read?op=get_realtime_token";

let client: Centrifuge | null = null;
let starting: Promise<void> | null = null;
let connected = false;
const listeners = new Set<Listener>();
const stateListeners = new Set<StateListener>();

function setConnected(next: boolean) {
  if (connected === next) return;
  connected = next;
  stateListeners.forEach((l) => l(next));
}

async function fetchToken(): Promise<TokenAnswer> {
  return (await requestV2<TokenAnswer>(TOKEN_URL, { method: "POST" })) || {};
}

async function start(): Promise<void> {
  const first = await fetchToken();
  if (!first.enabled || !first.url || !first.token) return;
  // A listener may have left while the token was on its way.
  if (listeners.size === 0 && stateListeners.size === 0) return;

  const c = new Centrifuge(first.url, {
    token: first.token,
    // Called when the token is about to expire or the server rejected it. An empty token tells
    // the client to stop: the user signed out or Centrifugo was turned off.
    getToken: async () => {
      const next = await fetchToken();
      return next.enabled && next.token ? next.token : "";
    },
  });
  let wasConnected = false;
  c.on("connected", () => {
    setConnected(true);
    if (wasConnected) {
      listeners.forEach((l) => {
        try {
          l({ type: "reconnected" });
        } catch (err) {
          console.warn("realtime listener failed", err);
        }
      });
    }
    wasConnected = true;
  });
  c.on("disconnected", () => setConnected(false));
  c.on("connecting", () => setConnected(false));
  // The user's channel is a server-side subscription, so its messages arrive on the client.
  c.on("publication", (ctx: PublicationContext) => {
    const data = (ctx.data || {}) as RealtimeEvent;
    listeners.forEach((l) => {
      try {
        l(data);
      } catch (err) {
        console.warn("realtime listener failed", err);
      }
    });
  });
  client = c;
  c.connect();
}

function ensureStarted() {
  if (client || starting || typeof window === "undefined") return;
  starting = start()
    .catch((err) => {
      // Polling carries on; the next subscriber will try again.
      console.warn("realtime: not connected", err);
    })
    .finally(() => {
      starting = null;
    });
}

function stopIfIdle() {
  if (listeners.size > 0 || stateListeners.size > 0 || !client) return;
  client.disconnect();
  client.removeAllListeners();
  client = null;
  setConnected(false);
}

/** Listens for chat events. Returns the function that stops listening. */
export function subscribeRealtime(listener: Listener): () => void {
  listeners.add(listener);
  ensureStarted();
  return () => {
    listeners.delete(listener);
    stopIfIdle();
  };
}

/** Reports whether the live connection is up, now and on each change. */
export function subscribeRealtimeState(listener: StateListener): () => void {
  stateListeners.add(listener);
  listener(connected);
  ensureStarted();
  return () => {
    stateListeners.delete(listener);
    stopIfIdle();
  };
}

/** Closes the connection, e.g. on sign-out. The next subscriber opens a fresh one. */
export function stopRealtime() {
  if (client) {
    client.disconnect();
    client.removeAllListeners();
    client = null;
  }
  setConnected(false);
}
