"use client";

import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { LIVE_HR_CHANNEL, LIVE_HR_EVENT, type LiveHrMessage } from "./protocol";

/**
 * Carries readings from whatever is holding the Bluetooth connection to whatever
 * is drawing the chart.
 *
 * Two transports, one interface:
 *
 *  - **Supabase Realtime broadcast** when configured. Readings leave the Mac and
 *    arrive on the iPhone, which is the entire point of the hybrid architecture —
 *    the phone can't do BLE from Safari, but it can certainly render a WebSocket.
 *    Broadcast channels are ephemeral and never touch the database, so a 1 Hz
 *    stream costs nothing in storage.
 *
 *  - **BroadcastChannel** otherwise. Same-browser, cross-tab only, but it means
 *    the live view works the moment you clone the repo, with no accounts to create.
 */

export interface Publisher {
  publish: (message: LiveHrMessage) => void;
  close: () => void;
}

export interface Subscriber {
  close: () => void;
}

export function isRealtimeConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function transportName(): "supabase" | "local" {
  return isRealtimeConfigured() ? "supabase" : "local";
}

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (!isRealtimeConfigured()) return null;
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
      {
        realtime: {
          // The strap sends ~1 reading/sec; the default 10/sec cap is plenty of headroom.
          params: { eventsPerSecond: 5 },
        },
      },
    );
  }
  return supabase;
}

export function createPublisher(): Publisher {
  const client = getSupabase();

  if (client) {
    const channel: RealtimeChannel = client.channel(LIVE_HR_CHANNEL, {
      config: { broadcast: { self: true, ack: false } },
    });
    channel.subscribe();

    return {
      publish: (message) => {
        void channel.send({ type: "broadcast", event: LIVE_HR_EVENT, payload: message });
      },
      close: () => {
        void client.removeChannel(channel);
      },
    };
  }

  const local = new BroadcastChannel(LIVE_HR_CHANNEL);
  return {
    publish: (message) => local.postMessage(message),
    close: () => local.close(),
  };
}

export function createSubscriber(onMessage: (message: LiveHrMessage) => void): Subscriber {
  const client = getSupabase();

  if (client) {
    const channel = client.channel(LIVE_HR_CHANNEL, {
      config: { broadcast: { self: true } },
    });

    channel
      .on("broadcast", { event: LIVE_HR_EVENT }, ({ payload }) => {
        onMessage(payload as LiveHrMessage);
      })
      .subscribe();

    return {
      close: () => {
        void client.removeChannel(channel);
      },
    };
  }

  const local = new BroadcastChannel(LIVE_HR_CHANNEL);
  local.onmessage = (event) => onMessage(event.data as LiveHrMessage);
  return { close: () => local.close() };
}
