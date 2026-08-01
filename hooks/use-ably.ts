"use client";

import { useEffect, useRef } from "react";
import * as Ably from "ably";
import { useUser } from "@clerk/nextjs";
import { useAblyContext } from "@/components/providers/ably-provider";

/**
 * Hook to subscribe to Ably channels using the global client from AblyProvider
 */
export function useAbly(channelName: string | null, eventName: string, callback: (message: any) => void) {
    const { user } = useUser();
    const ablyClient = useAblyContext();

    useEffect(() => {
        if (!user || !ablyClient || !channelName) return;

        const channel = ablyClient.channels.get(channelName);
        const listener = (message: any) => {
            callback(message.data);
        };

        channel.subscribe(eventName, listener);

        return () => {
            channel.unsubscribe(eventName, listener);
        };
    }, [channelName, eventName, callback, user, ablyClient]);

    return ablyClient;
}
