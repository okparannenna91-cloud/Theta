"use client";

import { useEffect, useRef } from "react";
import * as Ably from "ably";
import { useUser } from "@clerk/nextjs";

/**
 * Hook to subscribe to Ably channels
 */
export function useAbly(channelName: string, eventName: string, callback: (message: any) => void) {
    const { user } = useUser();
    const clientRef = useRef<Ably.Realtime | null>(null);

    useEffect(() => {
        if (!user) return;

        // Initialize Ably client with token auth
        const client = new Ably.Realtime({
            authUrl: "/api/ably/token",
            clientId: user.id,
        });
        clientRef.current = client;

        const channel = client.channels.get(channelName);

        // Subscribe to event
        channel.subscribe(eventName, (message) => {
            callback(message.data);
        });

        return () => {
            channel.unsubscribe();
            client.connection.close();
            clientRef.current = null;
        };
    }, [channelName, eventName, callback, user]);

    return clientRef.current;
}
