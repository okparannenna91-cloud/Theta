"use client";

import { useEffect, useState } from "react";
import { useAblyContext } from "@/components/providers/ably-provider";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PresenceData {
    id: string;
    name: string;
    imageUrl?: string;
    cursor?: { x: number, y: number };
}

interface LiveCursorsProps {
    nodeId: string;
}

export function LiveCursors({ nodeId }: LiveCursorsProps) {
    const ably = useAblyContext();
    const { user } = useUser();
    const [others, setOthers] = useState<Record<string, PresenceData>>({});

    useEffect(() => {
        if (!ably || !user) return;

        const channel = ably.channels.get(`intelligence:${nodeId}`);

        channel.presence.subscribe("enter", (member) => {
            setOthers(prev => ({ ...prev, [member.clientId]: member.data }));
        });

        channel.presence.subscribe("leave", (member) => {
            setOthers(prev => {
                const newOthers = { ...prev };
                delete newOthers[member.clientId];
                return newOthers;
            });
        });

        channel.presence.subscribe("update", (member) => {
            setOthers(prev => ({ ...prev, [member.clientId]: member.data }));
        });

        // Enter presence
        channel.presence.enter({
            id: user.id,
            name: user.fullName || "Collaborator",
            imageUrl: user.imageUrl,
            cursor: null
        });

        const handleMouseMove = (e: MouseEvent) => {
            const x = (e.clientX / window.innerWidth) * 100;
            const y = (e.clientY / window.innerHeight) * 100;
            channel.presence.update({
                id: user.id,
                name: user.fullName || "Collaborator",
                imageUrl: user.imageUrl,
                cursor: { x, y }
            });
        };

        window.addEventListener("mousemove", handleMouseMove);

        // Fetch initial presence
        channel.presence.get().then(members => {
            const initialOthers: Record<string, PresenceData> = {};
            members.forEach(m => {
                if (m.clientId !== user.id) {
                    initialOthers[m.clientId] = m.data;
                }
            });
            setOthers(initialOthers);
        });

        return () => {
            channel.presence.leave();
            channel.unsubscribe();
            window.removeEventListener("mousemove", handleMouseMove);
        };
    }, [ably, user, nodeId]);

    return (
        <>
            {/* Presence Avatars */}
            <div className="flex -space-x-2 mr-4">
                <AnimatePresence>
                    {Object.values(others).map((other) => (
                        <motion.div
                            key={other.id}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="relative"
                        >
                            <div className="h-8 w-8 rounded-full border-2 border-background overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center group">
                                {other.imageUrl ? (
                                    <img src={other.imageUrl} alt={other.name} className="h-full w-full object-cover" />
                                ) : (
                                    <UserIcon className="h-4 w-4 text-slate-400" />
                                )}
                            </div>
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-[8px] font-black uppercase text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                {other.name}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Live Cursors */}
            <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
                <AnimatePresence>
                    {Object.values(others).filter(o => o.cursor).map((other) => (
                        <motion.div
                            key={other.id}
                            initial={{ opacity: 0 }}
                            animate={{ 
                                opacity: 1,
                                x: `${other.cursor!.x}vw`,
                                y: `${other.cursor!.y}vh`
                            }}
                            exit={{ opacity: 0 }}
                            transition={{ type: "spring", damping: 30, stiffness: 200, mass: 0.5 }}
                            className="absolute flex flex-col items-start gap-1"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z" fill="#6366f1" stroke="white"/>
                            </svg>
                            <div className="px-2 py-1 rounded-full bg-indigo-600 text-[8px] font-black uppercase text-white shadow-xl whitespace-nowrap">
                                {other.name}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </>
    );
}
