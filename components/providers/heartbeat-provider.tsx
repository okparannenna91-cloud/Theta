"use client";

import { useEffect } from "react";

const HEARTBEAT_INTERVAL = 2 * 60 * 1000;

export function HeartbeatProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const sendHeartbeat = async () => {
            try {
                await fetch("/api/user/heartbeat", { method: "POST" });
            } catch {
                // silent
            }
        };

        sendHeartbeat();
        const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    return <>{children}</>;
}
