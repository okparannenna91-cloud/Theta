"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import * as Ably from "ably";
import { useUser } from "@clerk/nextjs";
import {
  Hash,
  Pin,
  PinOff,
  MoreVertical,
  MessageSquare,
  Reply,
  Image as ImageIcon,
  FileText,
  Paperclip,
  Lock,
  Send,
  Sparkles,
  X,
  Loader2,
  PanelRight,
  PanelRightOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { usePopups } from "@/components/popups/popup-manager";
import { FadeIn } from "@/components/common/motion-wrapper";
import { FileUpload } from "@/components/common/file-upload";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

import TeamPresence from "@/components/teams/chat/team-presence";
import WorkspaceReactions from "@/components/teams/chat/workspace-reactions";
import NovaInsightsPanel from "@/components/teams/chat/nova-insights-panel";
import TeamActivityFeed from "@/components/teams/chat/team-activity-feed";
import SharedTeamSpace from "@/components/teams/chat/shared-team-space";
import SmartHighlights from "@/components/teams/chat/smart-highlights";
import TeamAchievements from "@/components/teams/chat/team-achievements";
import ChatHeaderDashboard from "@/components/teams/chat/chat-header-dashboard";
import PinnedWidgets from "@/components/teams/chat/pinned-widgets";

interface TeamChatEnhancedProps {
  teamId: string;
  workspaceId: string;
}

export function TeamChatEnhanced({ teamId, workspaceId }: TeamChatEnhancedProps) {
  const { user } = useUser();
  const { showUpgradePrompt } = usePopups();
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<any>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [lastReadAt, setLastReadAt] = useState<string | null>(null);
  const [limits, setLimits] = useState({ current: 0, max: -1 });
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [dbUser, setDbUser] = useState<any>(null);
  const [replyTo, setReplyTo] = useState<any>(null);

  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, { name: string; timestamp: number }>>({});
  const [readReceipts, setReadReceipts] = useState<Record<string, string>>({});
  const [showSidePanel, setShowSidePanel] = useState(true);

  const ablyRef = useRef<Ably.Realtime | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastReadRef = useRef<string | null>(null);
  const lastTypedRef = useRef<number>(0);
  const isPrependingRef = useRef(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => setDbUser(data))
      .catch(err => console.error("Failed to fetch DB user profile:", err));
  }, []);

  const markAsRead = useCallback(async () => {
    if (!teamId || !workspaceId) return;
    try {
      await fetch("/api/chat/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, workspaceId })
      });
      const now = new Date().toISOString();
      setLastReadAt(now);
      lastReadRef.current = now;
    } catch (err) {
      console.error("Failed to mark chat as read", err);
    }
  }, [teamId, workspaceId]);

  const fetchMessages = useCallback(async (cursorParam?: string | null) => {
    try {
      if (!workspaceId || !teamId || workspaceId === "undefined" || teamId === "undefined") return;
      if (!cursorParam) setIsLoading(true);
      const url = `/api/chat?workspaceId=${workspaceId}&teamId=${teamId}${cursorParam ? `&cursor=${cursorParam}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load messages");
      const data = await res.json();
      if (data.messages && Array.isArray(data.messages)) {
        if (cursorParam) {
          const scrollNode = scrollRef.current;
          const oldScrollHeight = scrollNode ? scrollNode.scrollHeight : 0;
          isPrependingRef.current = true;
          setMessages(prev => [...data.messages, ...prev]);
          requestAnimationFrame(() => {
            if (scrollNode) scrollNode.scrollTop = scrollNode.scrollHeight - oldScrollHeight;
          });
        } else {
          setMessages(prev => data.messages);
        }
        setCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
        if (data.limits) setLimits(data.limits);
        if (data.lastReadAt && !cursorParam) {
          setLastReadAt(data.lastReadAt);
          lastReadRef.current = data.lastReadAt;
        }
        if (!cursorParam) markAsRead();
      }
    } catch (err) {
      console.error("[Chat] Failed to fetch messages:", err);
    } finally {
      if (!cursorParam) setIsLoading(false);
    }
  }, [teamId, workspaceId, markAsRead]);

  const connectAbly = useCallback(async () => {
    if (!user?.id || !teamId) return;
    try {
      setIsLoading(true);
      setIsConnected(false);
      if (ablyRef.current) ablyRef.current.close();

      const ably = new Ably.Realtime({ authUrl: "/api/ably/token", clientId: user.id });
      const channelName = `team:${teamId}:chat`;
      const channel = ably.channels.get(channelName);

      ably.connection.on("connected", () => {
        setIsConnected(true);
        setIsLoading(false);
      });

      channel.subscribe("message", (msg) => {
        setMessages((prev) => {
          const incoming = msg.data;
          const exists = prev.some(m => m.id === incoming.id || (incoming.tempId && m.tempId === incoming.tempId));
          if (exists) return prev.map(m => (incoming.tempId && m.tempId === incoming.tempId) ? incoming : m);
          return [...prev, incoming];
        });
      });

      channel.subscribe("message:updated", (msg) => {
        setMessages((prev) => prev.map(m => m.id === msg.data.id ? { ...m, ...msg.data } : m));
      });

      channel.subscribe("message:deleted", (msg) => {
        setMessages((prev) => prev.map(m => m.id === msg.data.id ? { ...m, deletedAt: new Date().toISOString() } : m));
      });

      channel.subscribe("typing", (msg) => {
        if (msg.data.userId === user.id) return;
        setTypingUsers(prev => ({ ...prev, [msg.data.userId]: { name: msg.data.name, timestamp: Date.now() } }));
        setTimeout(() => {
          setTypingUsers(prev => {
            const next = { ...prev };
            let changed = false;
            for (const id in next) { if (Date.now() - next[id].timestamp > 2500) { delete next[id]; changed = true; } }
            return changed ? next : prev;
          });
        }, 3000);
      });

      channel.subscribe("read:updated", (msg) => {
        const { userId, timestamp } = msg.data;
        if (userId !== user.id) setReadReceipts(prev => ({ ...prev, [userId]: timestamp }));
      });

      channel.presence.enter({ id: user.id, name: user.fullName || user.firstName || "User", imageUrl: user.imageUrl });
      channel.presence.subscribe(['enter', 'leave', 'update'], () => {
        channel.presence.get().then((members) => { if (members) setOnlineUsers(members.map(m => m.data)); }).catch(console.error);
      });

      ablyRef.current = ably;
      channelRef.current = channel;

      ably.connection.once("connected", () => {
        setMessages(prev => { if (prev.length === 0) fetchMessages(); return prev; });
      });
    } catch (error) {
      console.error("[Chat] Ably setup error:", error);
      setIsLoading(false);
    }
  }, [teamId, user?.id, user?.fullName, user?.firstName, user?.imageUrl, fetchMessages]);

  useEffect(() => { if (teamId && workspaceId) fetchMessages(); }, [teamId, workspaceId, fetchMessages]);
  useEffect(() => {
    if (user?.id && teamId) connectAbly();
    return () => { if (ablyRef.current) { ablyRef.current.close(); ablyRef.current = null; } };
  }, [connectAbly, user?.id, teamId]);

  useEffect(() => {
    if (scrollRef.current && !isPrependingRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    isPrependingRef.current = false;
  }, [messages]);

  const handleScroll = () => { if (scrollRef.current?.scrollTop === 0 && hasMore && !isFetchingMore) fetchMessages(cursor); };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    if (!channelRef.current || !user?.id) return;
    const now = Date.now();
    if (now - lastTypedRef.current > 2000) {
      channelRef.current.publish("typing", { userId: user.id, name: user.fullName || user.firstName || "Someone" });
      lastTypedRef.current = now;
    }
  };

  const isLimitReached = limits.max !== -1 && limits.current >= limits.max;

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !attachment) || !teamId || !workspaceId) return;
    if (isLimitReached) { showUpgradePrompt("chat"); return; }

    const tempId = Date.now().toString();
    const optimisticMsg = {
      id: tempId, tempId, content: message, userId: user?.id, attachment, replyTo, createdAt: new Date().toISOString(),
      user: { name: user?.fullName || user?.firstName || "You", imageUrl: user?.imageUrl }
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setMessage(""); setAttachment(null); setReplyTo(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: optimisticMsg.content || "Sent an attachment", workspaceId, teamId, attachment: optimisticMsg.attachment, tempId, replyToId: optimisticMsg.replyTo?.id }),
      });
      if (!res.ok) {
        setMessages(prev => prev.filter(m => m.tempId !== tempId));
        if (res.status === 403) showUpgradePrompt("chat");
      } else {
        const savedMsg = await res.json();
        setMessages(prev => prev.map(m => m.tempId === tempId ? { ...savedMsg, user: m.user } : m));
        markAsRead();
      }
    } catch (error) { setMessages(prev => prev.filter(m => m.tempId !== tempId)); }
  };

  const togglePin = async (msg: any) => {
    try {
      await fetch(`/api/chat?id=${msg.id}&workspaceId=${workspaceId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPinned: !msg.isPinned }) });
      toast.success(msg.isPinned ? "Unpinned" : "Pinned");
    } catch (err) { toast.error("Failed to update pin"); }
  };

  const handleReactionToggle = async (messageId: string, reactionId: string) => {
    try {
      const res = await fetch("/api/chat/reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, reactionId }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: data.reactions } : m));
    } catch {
      toast.error("Failed to toggle reaction");
    }
  };

  const pinnedMessages = messages.filter(m => m.isPinned && !m.deletedAt);
  const latestSeenMessageMap: Record<string, string[]> = {};
  Object.entries(readReceipts).forEach(([uid, t]) => {
    let lastSeenMsgId = null;
    for (let i = messages.length - 1; i >= 0; i--) { if (messages[i].createdAt <= t) { lastSeenMsgId = messages[i].id; break; } }
    if (lastSeenMsgId) { if (!latestSeenMessageMap[lastSeenMsgId]) latestSeenMessageMap[lastSeenMsgId] = []; latestSeenMessageMap[lastSeenMsgId].push(uid); }
  });

  return (
    <div className="flex h-full bg-transparent relative overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="p-4 sm:p-6 border-b flex items-center justify-between bg-background/40 backdrop-blur-3xl z-20">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/5 flex items-center justify-center border shrink-0">
              <Hash className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-semibold tracking-tight leading-none">Team Chat</h3>
              <div className="flex items-center gap-3 mt-1">
                <TeamPresence onlineUsers={onlineUsers} />
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <ChatHeaderDashboard workspaceId={workspaceId} teamId={teamId} />
          </div>

          <div className="flex items-center gap-2 ml-2">
            {pinnedMessages.length > 0 && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-3 py-1.5 rounded-lg text-[10px] font-semibold hidden sm:flex">
                <Pin className="h-3 w-3 mr-1.5" /> {pinnedMessages.length}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg text-muted-foreground"
              onClick={() => setShowSidePanel(!showSidePanel)}
            >
              {showSidePanel ? <PanelRightOpen className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
            </Button>
            <div className="h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center border">
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Pinned Bar */}
        {pinnedMessages.length > 0 && (
          <div className="bg-amber-500/5 border-b border-amber-500/10 backdrop-blur-xl z-10">
            {pinnedMessages.slice(0, 3).map(msg => (
              <div key={msg.id} className="p-3 px-6 flex items-center justify-between gap-6">
                <div className="flex items-center gap-4 min-w-0">
                  <Pin className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-xs font-medium text-amber-600/80 truncate">
                    Pinned: {msg.content}
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-500 rounded-md shrink-0" onClick={() => togglePin(msg)}>
                  <PinOff className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 no-scrollbar" ref={scrollRef} onScroll={handleScroll}>
          {isLoading && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-20">
              <Loader2 className="h-16 w-16 sm:h-20 sm:w-20 animate-spin mb-6" />
              <p className="text-xs font-semibold">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-10">
              <MessageSquare className="h-24 w-24 sm:h-32 sm:w-32 mb-6" />
              <p className="text-xs font-semibold">No messages yet.</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.userId === dbUser?.id || msg.userId === user?.id;
              const prevMsg = messages[idx - 1];
              const isSameSender = prevMsg?.userId === msg.userId;

              return (
                <FadeIn key={msg.id} delay={0.02} className={cn("flex group", isMe ? "justify-end" : "justify-start", isSameSender ? "mt-[-1rem]" : "mt-0")}>
                  <div className={cn("flex gap-3 max-w-[85%] sm:max-w-[75%]", isMe ? "flex-row-reverse" : "flex-row")}>
                    {!isSameSender ? (
                      <div className={cn("h-8 w-8 sm:h-10 sm:w-10 rounded-xl shrink-0 flex items-center justify-center text-xs font-semibold border transition-all", isMe ? "bg-primary text-primary-foreground" : "bg-muted")}>
                        {msg.user?.name?.slice(0, 2).toUpperCase() || "U"}
                      </div>
                    ) : (
                      <div className="w-8 sm:w-10 shrink-0" />
                    )}
                    <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                      {!isSameSender && (
                        <div className="flex items-center gap-3 mb-1.5 px-2">
                          <span className="text-xs font-medium text-muted-foreground">{msg.user?.name || "Anonymous"}</span>
                          <span className="text-[10px] text-muted-foreground">{format(new Date(msg.createdAt), "HH:mm")}</span>
                          {msg.isPinned && <Pin className="h-3 w-3 text-amber-500" />}
                        </div>
                      )}

                      <div className="relative group/bubble">
                        <div className={cn(
                          "rounded-xl px-4 py-2.5 sm:px-5 sm:py-3 text-sm backdrop-blur-3xl border transition-all",
                          isMe
                            ? "bg-primary text-primary-foreground rounded-tr-none"
                            : "bg-background/40 text-foreground rounded-tl-none"
                        )}>
                          {msg.replyTo && (
                            <div className={cn("mb-2.5 p-2.5 rounded-lg text-xs border-l-4", isMe ? "bg-black/10 border-white/30 text-white/70" : "bg-muted border-primary/30 text-muted-foreground")}>
                              <div className="font-semibold mb-0.5 flex items-center gap-2">
                                <Reply className="h-3 w-3" /> Replying to {msg.replyTo.userId === user?.id ? "you" : (msg.replyTo.user?.name || "User")}
                              </div>
                              <span className="line-clamp-2 italic">{msg.replyTo.content}</span>
                            </div>
                          )}
                          {msg.attachment && (() => {
                            const url = (() => {
                              try { const u = new URL(msg.attachment.url); if (u.protocol === "http:" || u.protocol === "https:") return u.href; } catch {}
                              return "#";
                            })();
                            return (
                              <div className="mb-3">
                                {msg.attachment.category === "image" ? (
                                  <a href={url} target="_blank" rel="noopener noreferrer" className="block relative h-48 sm:h-60 w-full sm:w-80 overflow-hidden rounded-xl border hover:scale-[1.02] transition-transform duration-500">
                                    <Image src={url} alt="Image" fill className="object-cover" />
                                  </a>
                                ) : (
                                  <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-black/10 rounded-xl hover:bg-black/20 transition-all">
                                    <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center"><FileText className="h-4 w-4" /></div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-xs font-semibold truncate max-w-[120px] sm:max-w-[150px]">{msg.attachment.originalName}</span>
                                      <span className="text-[10px] text-muted-foreground">Document</span>
                                    </div>
                                  </a>
                                )}
                              </div>
                            );
                          })()}
                          <span>{msg.content}</span>
                        </div>

                        {msg.userId !== user?.id && (
                          <WorkspaceReactions
                            messageId={msg.id}
                            reactions={msg.reactions}
                            currentUserId={user?.id}
                            onReactionToggle={handleReactionToggle}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </FadeIn>
              );
            })
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 sm:p-6 border-t bg-background/40 backdrop-blur-3xl z-20">
          {Object.keys(typingUsers).length > 0 && (
            <div className="absolute -top-7 left-12 text-xs text-primary font-medium flex items-center gap-2">
              <div className="flex gap-1">
                <div className="h-1 w-1 bg-primary rounded-full animate-bounce" />
                <div className="h-1 w-1 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="h-1 w-1 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
              {Object.values(typingUsers)[0].name} typing...
            </div>
          )}

          {(replyTo || attachment) && (
            <div className="mb-4 flex flex-col gap-2">
              {replyTo && (
                <div className="flex items-center justify-between p-3 bg-primary/5 border rounded-lg backdrop-blur-xl">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Reply className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-primary">Replying to {replyTo.user?.name}</span>
                      <span className="text-xs text-muted-foreground truncate">{replyTo.content}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md shrink-0" onClick={() => setReplyTo(null)}><X className="h-3.5 w-3.5" /></Button>
                </div>
              )}
              {attachment && (
                <div className="flex items-center justify-between p-3 bg-primary/5 border rounded-lg backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    {attachment.category === "image" ? <ImageIcon className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold tracking-tight text-primary">{attachment.originalName}</span>
                      <span className="text-[10px] text-muted-foreground">Attached</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => setAttachment(null)}><X className="h-3.5 w-3.5" /></Button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={sendMessage} className="flex gap-3">
            <div className="flex-1 flex gap-2 p-1.5 sm:p-2 bg-background/50 rounded-xl border focus-within:ring-4 focus-within:ring-primary/10 transition-all shadow-sm backdrop-blur-2xl">
              <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-primary shrink-0 h-10 w-10 rounded-full transition-colors hover:bg-primary/5" disabled={!isConnected}>
                    <Paperclip className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-xl border bg-background/80 backdrop-blur-3xl p-6 sm:p-8 shadow-2xl max-w-lg">
                  <DialogHeader className="mb-6">
                    <DialogTitle className="text-xl font-semibold tracking-tight">Attach File</DialogTitle>
                  </DialogHeader>
                  <FileUpload workspaceId={workspaceId} onUploadComplete={(data) => { setAttachment({ url: data.url || data.secure_url, originalName: data.originalName || "File", category: (data.url || data.secure_url).match(/\.(jpeg|jpg|gif|png|webp)$/i) ? "image" : "document" }); setIsUploadOpen(false); }} />
                </DialogContent>
              </Dialog>
              <Input
                placeholder={isLimitReached ? "Message limit reached" : "Type a message..."}
                value={message} onChange={handleInputChange}
                className="border-none bg-transparent shadow-none focus-visible:ring-0 text-sm h-10"
                disabled={!isConnected || isLimitReached}
              />
              <Button type="submit" size="icon" disabled={!isConnected || isLimitReached || (!message.trim() && !attachment)} className="bg-primary hover:bg-primary/90 shrink-0 h-10 w-10 rounded-full shadow-md hover:scale-105 active:scale-95 transition-all">
                {isLimitReached ? <Lock className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </form>

          {isLimitReached && (
            <FadeIn delay={0.1} className="mt-4 flex items-center justify-between p-4 sm:p-6 rounded-xl bg-primary text-primary-foreground shadow-md group overflow-hidden relative">
              <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10" />
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xl shadow-lg shadow-black/20">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-semibold tracking-tight">Team Chat</h4>
                  <p className="text-xs text-white/70">Unlock unlimited messaging</p>
                </div>
              </div>
              <Button variant="outline" className="h-10 px-6 rounded-lg font-semibold text-xs bg-white text-primary border-none hover:scale-105 transition-all shadow-xl" onClick={() => showUpgradePrompt("chat")}>Upgrade</Button>
            </FadeIn>
          )}
        </div>
      </div>

      {/* Side Panel */}
      {showSidePanel && (
        <div className="w-72 lg:w-80 border-l bg-background/40 backdrop-blur-3xl overflow-y-auto hidden lg:block">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Workspace Hub</span>
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <SharedTeamSpace workspaceId={workspaceId} teamId={teamId} />
            <SmartHighlights messages={messages} />
            <NovaInsightsPanel teamId={teamId} workspaceId={workspaceId} messages={messages} />
            <TeamActivityFeed workspaceId={workspaceId} teamId={teamId} />
            <TeamAchievements teamId={teamId} workspaceId={workspaceId} />
            <PinnedWidgets workspaceId={workspaceId} teamId={teamId} />
          </div>
        </div>
      )}

      {/* Mobile side panel toggle */}
      {!showSidePanel && (
        <button
          onClick={() => setShowSidePanel(true)}
          className="lg:hidden fixed right-4 bottom-24 z-30 w-10 h-10 rounded-full bg-primary shadow-lg flex items-center justify-center text-white"
        >
          <PanelRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
