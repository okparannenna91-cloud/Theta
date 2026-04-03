"use client";

import { useEffect, useState, useRef } from "react";
import * as Ably from "ably";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface WikiPresenceProps {
    documentId: string;
}

export function WikiPresence({ documentId }: WikiPresenceProps) {
    const { user } = useUser();
    const [presenceMembers, setPresenceMembers] = useState<any[]>([]);
    const ablyRef = useRef<Ably.Realtime | null>(null);

    useEffect(() => {
        if (!user?.id || !documentId) return;

        const ably = new Ably.Realtime({
            authUrl: "/api/ably/token",
            clientId: user.id
        });

        const channel = ably.channels.get(`doc:${documentId}:presence`);

        channel.presence.subscribe("enter", (member) => {
            setPresenceMembers((prev) => [...prev, member]);
        });

        channel.presence.subscribe("leave", (member) => {
            setPresenceMembers((prev) => prev.filter(m => m.clientId !== member.clientId));
        });

        channel.presence.enter({
            name: user.fullName || user.firstName || "Anonymous",
            imageUrl: user.imageUrl
        });

        channel.presence.get((err, members) => {
            if (!err && members) {
                setPresenceMembers(members);
            }
        });

        ablyRef.current = ably;

        return () => {
            channel.presence.leave();
            ably.close();
        };
    }, [documentId, user?.id]);

    return (
        <TooltipProvider>
            <div className="flex -space-x-2 overflow-hidden items-center">
                <AnimatePresence>
                    {presenceMembers.map((member) => (
                        <motion.div
                            key={member.clientId}
                            initial={{ scale: 0, opacity: 0, x: -10 }}
                            animate={{ scale: 1, opacity: 1, x: 0 }}
                            exit={{ scale: 0, opacity: 0, x: 10 }}
                            className="relative"
                        >
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Avatar className="h-8 w-8 border-2 border-white dark:border-slate-900 ring-2 ring-indigo-500/10 shadow-sm transition-transform hover:scale-110 cursor-pointer">
                                        <AvatarImage src={member.data?.imageUrl} />
                                        <AvatarFallback className="text-[8px] font-black uppercase tracking-tighter bg-indigo-600 text-white">
                                            {member.data?.name?.slice(0, 2).toUpperCase() || "AN"}
                                        </AvatarFallback>
                                    </Avatar>
                                </TooltipTrigger>
                                <TooltipContent className="rounded-xl border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                                    <p className="text-[10px] font-black uppercase tracking-widest">{member.data?.name || "Viewing"}</p>
                                </TooltipContent>
                            </Tooltip>
                            <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-sm animate-pulse" />
                        </motion.div>
                    ))}
                </AnimatePresence>
                {presenceMembers.length > 5 && (
                    <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-black text-slate-500">
                        +{presenceMembers.length - 5}
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
}
