"use client";

import { useState, useEffect, useCallback } from "react";

export function SimpleChat({ teamId, workspaceId }: { teamId: string, workspaceId: string }) {
    const [messages, setMessages] = useState<any[]>([]);
    const [status, setStatus] = useState("Initializing...");

    const fetchRaw = useCallback(async () => {
        try {
            setStatus("Fetching...");
            const url = `/api/chat?workspaceId=${workspaceId}&teamId=${teamId}`;
            const res = await fetch(url);
            
            if (!res.ok) {
                const text = await res.text();
                setStatus(`Error ${res.status}: ${text.slice(0, 50)}`);
                return;
            }

            const data = await res.json();
            console.log("[SimpleChat] Received data:", data);
            
            if (data.messages) {
                setMessages(data.messages);
                setStatus(`Success: Found ${data.messages.length} messages`);
            } else {
                setStatus("Success: No messages field in response");
            }
        } catch (err: any) {
            setStatus(`Fatal Error: ${err.message}`);
        }
    }, [teamId, workspaceId]);

    useEffect(() => {
        fetchRaw();
    }, [fetchRaw]);

    return (
        <div className="p-4 bg-slate-100 dark:bg-slate-900 h-full overflow-y-auto">
            <div className="mb-4 p-2 bg-blue-100 dark:bg-blue-900/30 text-xs rounded border border-blue-200">
                <strong>DIAGNOSTIC VIEW</strong><br/>
                Status: {status}<br/>
                WS: {workspaceId}<br/>
                TM: {teamId}
            </div>

            <div className="space-y-2">
                {messages.length === 0 && <div className="text-center py-10 opacity-50">No messages found in this team.</div>}
                {messages.map((m: any) => (
                    <div key={m.id} className="p-3 bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="text-[10px] font-bold text-indigo-600 mb-1">{m.user?.name || "Unknown"}</div>
                        <div className="text-sm">{m.content}</div>
                        <div className="text-[8px] opacity-30 mt-1">{new Date(m.createdAt).toLocaleString()}</div>
                    </div>
                ))}
            </div>

            <button 
                onClick={() => fetchRaw()}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded text-xs"
            >
                Retry Fetch
            </button>
        </div>
    );
}
