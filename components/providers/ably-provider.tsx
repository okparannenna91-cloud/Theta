"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import * as Ably from "ably";
import { useUser } from "@clerk/nextjs";

const AblyContext = createContext<Ably.Realtime | null>(null);

export const useAblyContext = () => useContext(AblyContext);

export function AblyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const clientRef = useRef<Ably.Realtime | null>(null);
  const [client, setClient] = useState<Ably.Realtime | null>(null);

  useEffect(() => {
    if (!user) {
      if (clientRef.current) {
        clientRef.current.connection.close();
        clientRef.current = null;
        setClient(null);
      }
      return;
    }

    if (!clientRef.current) {
      const ablyClient = new Ably.Realtime({
        authUrl: "/api/ably/token",
        clientId: user.id,
      });

      ablyClient.connection.on("connected", () => {
        console.log("Ably Connected");
      });

      ablyClient.connection.on("disconnected", () => {
        console.log("Ably Disconnected");
      });

      clientRef.current = ablyClient;
      setClient(ablyClient);
    }

    return () => {
      if (clientRef.current) {
        clientRef.current.connection.close();
        clientRef.current = null;
        setClient(null);
      }
    };
  }, [user]);

  return (
    <AblyContext.Provider value={client}>
      {children}
    </AblyContext.Provider>
  );
}
