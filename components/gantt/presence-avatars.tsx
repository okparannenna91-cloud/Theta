"use client";

import { useEffect, useState } from "react";
import { useAblyContext } from "@/components/providers/ably-provider";
import { useUser } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";

interface PresenceAvatarsProps {
    workspaceId: string;
}

export default function PresenceAvatars({ workspaceId }: PresenceAvatarsProps) {
    const { user } = useUser();
    const ablyClient = useAblyContext();
    const [members, setMembers] = useState<any[]>([]);

    useEffect(() => {
        if (!user || !ablyClient || !workspaceId) return;

        const channel = ablyClient.channels.get(`workspace:${workspaceId}:gantt:presence`);
        
        // Enter presence
        channel.presence.enter({
            id: user.id,
            name: user.fullName || user.username || "Anonymous",
            image: user.imageUrl,
        });

        // Subscribe to presence events
        const updateMembers = async () => {
            const members = await channel.presence.get();
            setMembers(members.map(m => m.data));
        };

        channel.presence.subscribe("enter", updateMembers);
        channel.presence.subscribe("leave", updateMembers);
        channel.presence.subscribe("update", updateMembers);

        updateMembers();

        return () => {
            channel.presence.leave();
            channel.presence.unsubscribe();
        };
    }, [user, ablyClient, workspaceId]);

    return (
        <div className="flex -space-x-3 items-center">
            <AnimatePresence>
                {members.map((member, i) => (
                    <TooltipProvider key={member.id || i}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.5, x: 10 }}
                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.5, x: 10 }}
                                    className="relative"
                                >
                                    <Avatar className="h-8 w-8 border-2 border-background ring-2 ring-primary/20 shadow-lg cursor-pointer transition-transform hover:scale-110 hover:z-10">
                                        <AvatarImage src={member.image} />
                                        <AvatarFallback className="bg-primary/10 text-[10px] font-black uppercase">
                                            {member.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background" />
                                </motion.div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-900 text-white border-none rounded-xl text-[10px] font-black uppercase tracking-widest">
                                {member.name} (VIEWING)
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ))}
            </AnimatePresence>
            {members.length > 5 && (
                <div className="h-8 w-8 rounded-full bg-secondary border-2 border-background flex items-center justify-center text-[10px] font-black text-muted-foreground z-10">
                    +{members.length - 5}
                </div>
            )}
        </div>
    );
}
