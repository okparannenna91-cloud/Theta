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
            setPresenceMembers((prev) => {
                 const exists = prev.some(m => m.clientId === member.clientId);
                 if (exists) return prev;
                 return [...prev, member];
            });
        });

        channel.presence.subscribe("leave", (member) => {
            setPresenceMembers((prev) => prev.filter(m => m.clientId !== member.clientId));
        });

        channel.presence.enter({
            name: user.fullName || user.firstName || "Anonymous",
            imageUrl: user.imageUrl
        });

        channel.presence.get().then((members) => {
            setPresenceMembers(members);
        }).catch(err => console.error("Presence Retrieval Error", err));

        ablyRef.current = ably;

        return () => {
            channel.presence.leave();
            ably.close();
        };
    }, [documentId, user?.id]);

    return (
        <TooltipProvider>
            <div className="flex -space-x-2 overflow-hidden items-center group/presence">
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
                                    <Avatar className="h-8 w-8 border-2 border-white dark:border-slate-900 ring-2 ring-indigo-500/10 shadow-sm transition-all hover:scale-125 hover:z-50 cursor-pointer">
                                        <AvatarImage src={member.data?.imageUrl} />
                                        <AvatarFallback className="text-[8px] font-black uppercase tracking-tighter bg-indigo-600 text-white">
                                            {member.data?.name?.slice(0, 2).toUpperCase() || "AN"}
                                        </AvatarFallback>
                                    </Avatar>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="z-[200]">
                                    <p className="font-black tracking-widest">{member.data?.name || "Viewing Now"}</p>
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
