"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import type * as Ably from "ably";
import { useUser } from "@clerk/nextjs";

const AblyContext = createContext<Ably.Realtime | null>(null);

export const useAblyContext = () => useContext(AblyContext);

export function AblyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const clientRef = useRef<Ably.Realtime | null>(null);
  const [client, setClient] = useState<Ably.Realtime | null>(null);

  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentId = user?.id ?? null;

    // Only reconnect if the user ID actually changed (not on object reference changes)
    if (currentId === userIdRef.current) return;
    userIdRef.current = currentId;

    if (!currentId) {
      if (clientRef.current) {
        clientRef.current.connection.close();
        clientRef.current = null;
        setClient(null);
      }
      return;
    }

    if (clientRef.current) {
      clientRef.current.connection.close();
      clientRef.current = null;
      setClient(null);
    }

    let cancelled = false;

    (async () => {
      const AblyMod = (await import("ably")).default;
      if (cancelled || currentId !== userIdRef.current) return;

      const ablyClient = new AblyMod.Realtime({
        authUrl: "/api/ably/token",
        clientId: currentId,
      });

      ablyClient.connection.on("connected", () => {
        console.log("Ably Connected");
      });

      ablyClient.connection.on("disconnected", () => {
        console.log("Ably Disconnected");
      });

      if (cancelled || currentId !== userIdRef.current) {
        ablyClient.connection.close();
        return;
      }

      clientRef.current = ablyClient;
      setClient(ablyClient);
    })();

    return () => {
      cancelled = true;
      if (clientRef.current) {
        clientRef.current.connection.close();
        clientRef.current = null;
        setClient(null);
      }
    };
  }, [user?.id]); // depend on user.id string instead of user object

  return (
    <AblyContext.Provider value={client}>
      {children}
    </AblyContext.Provider>
  );
}
