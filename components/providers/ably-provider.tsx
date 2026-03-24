"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import * as Ably from "ably";
import { useUser } from "@clerk/nextjs";

const AblyContext = createContext<Ably.Realtime | null>(null);

export const useAblyContext = () => useContext(AblyContext);

export function AblyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [client, setClient] = useState<Ably.Realtime | null>(null);

  useEffect(() => {
    // If no user, close the connection if it exists
    if (!user) {
      if (client) {
        client.connection.close();
        setClient(null);
      }
      return;
    }

    // Initialize Ably client only if it doesn't exist
    if (!client) {
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

      setClient(ablyClient);
    }

    // Cleanup when user changes significantly or component unmounts
    return () => {
      // Actually we don't want to close it here on every render, 
      // but let's handle the top-level cleanup in a separate useEffect.
    };
  }, [user, client]);

  // Handle final cleanup on unmount
  useEffect(() => {
    return () => {
      if (client) {
        client.connection.close();
      }
    };
  }, [client]);

  return (
    <AblyContext.Provider value={client}>
      {children}
    </AblyContext.Provider>
  );
}
