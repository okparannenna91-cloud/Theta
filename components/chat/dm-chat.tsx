"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Pin, PinOff, MessageSquare, Reply,
  Image as ImageIcon, FileText, Paperclip, Send,
  X, Loader2, AlertCircle, ChevronRight, ChevronLeft, User as UserIcon, Mail,
} from "lucide-react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { usePopups } from "@/components/popups/popup-manager";
import { FadeIn } from "@/components/common/motion-wrapper";
import { FileUpload } from "@/components/common/file-upload";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface DmChatProps {
  conversationId: string;
  workspaceId: string;
  onBack?: () => void;
}

export function DmChat({ conversationId, workspaceId, onBack }: DmChatProps) {
  const { user } = useUser();
  const { showUpgradePrompt } = usePopups();

  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<any>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [conversation, setConversation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [dbUser, setDbUser] = useState<any>(null);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, { name: string; timestamp: number }>>({});
  const [showDetails, setShowDetails] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const ablyRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTypedRef = useRef<number>(0);
  const isPrependingRef = useRef(false);
  const fetchedRef = useRef(false);
  const composerRef = useRef<HTMLInputElement>(null);

  const participant = useMemo(() => {
    if (!conversation?.participants) return null;
    return conversation.participants[0] || null;
  }, [conversation]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => setDbUser(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!conversationId || !workspaceId) return;
    fetch(`/api/chat/dm/conversations?workspaceId=${workspaceId}`)
      .then(res => res.json())
      .then(data => {
        const conv = data.conversations?.find((c: any) => c.id === conversationId);
        if (conv) setConversation(conv);
      })
      .catch(() => {});
  }, [conversationId, workspaceId]);

  const fetchMessages = useCallback(async (cursorParam?: string | null) => {
    if (!workspaceId || !conversationId) return;
    try {
      if (!cursorParam) {
        setIsLoading(true);
        fetchedRef.current = false;
      } else {
        setIsFetchingMore(true);
      }
      const url = `/api/chat/dm?workspaceId=${workspaceId}&conversationId=${conversationId}${cursorParam ? `&cursor=${cursorParam}` : ""}&_=${Date.now()}`;
      const res = await fetch(url, { cache: "no-store" });
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
          setMessages(data.messages);
        }
        setCursor(data.nextCursor);
        setHasMore(!!data.nextCursor && data.hasMore);
      }
    } catch (err) {
      console.error("[DM Chat] Failed to fetch messages:", err);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }, [conversationId, workspaceId]);

  const subscribeChannel = useCallback((ably: any, channel: any) => {
    channel.subscribe("message", (msg: any) => {
      const incoming = msg.data;
      const currentUserId = dbUser?.id || user?.id;
      if (incoming.userId === currentUserId || incoming.user?.id === currentUserId) return;
      setMessages((prev) => {
        const exists = prev.some(m => m.id === incoming.id || (incoming.tempId && m.tempId === incoming.tempId));
        if (exists) return prev;
        return [...prev, incoming];
      });
    });

    channel.subscribe("message:updated", (msg: any) => {
      setMessages((prev) => prev.map(m => m.id === msg.data.id ? { ...m, ...msg.data } : m));
    });

    channel.subscribe("message:deleted", (msg: any) => {
      setMessages((prev) => prev.map(m => m.id === msg.data.id ? { ...m, deletedAt: new Date().toISOString() } : m));
    });

    channel.subscribe("typing", (msg: any) => {
      if (msg.data.userId === user?.id) return;
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

    channel.presence.enter({
      id: user?.id,
      name: user?.fullName || user?.firstName || "User",
      imageUrl: user?.imageUrl,
    }).catch(() => {});
  }, [user?.id, user?.fullName, user?.firstName, user?.imageUrl]);

  const connectAbly = useCallback(async () => {
    if (!user?.id || !conversationId) return;
    try {
      setIsConnected(false);
      if (ablyRef.current) { ablyRef.current.close(); }

      const Ably = (await import("ably")).default;
      const ably = new Ably.Realtime({
        authUrl: `/api/ably/token?workspaceId=${workspaceId}&conversationId=${conversationId}`,
        clientId: user.id,
      });
      const channelName = `dm:${conversationId}`;
      const channel = ably.channels.get(channelName);

      ably.connection.on("connected", () => {
        setIsConnected(true);
        setReconnecting(false);
      });
      ably.connection.on("disconnected", () => setIsConnected(false));
      ably.connection.on("suspended", () => { setIsConnected(false); setReconnecting(true); });
      ably.connection.on("failed", () => { setIsConnected(false); setReconnecting(true); });

      subscribeChannel(ably, channel);

      ablyRef.current = ably;
      channelRef.current = channel;
    } catch (error) {
      console.error("[DM Chat] Ably setup error:", error);
      setReconnecting(true);
    }
  }, [conversationId, workspaceId, user?.id, subscribeChannel]);

  useEffect(() => {
    if (conversationId && workspaceId && !fetchedRef.current) {
      fetchMessages();
    }
  }, [conversationId, workspaceId, fetchMessages]);

  useEffect(() => {
    if (user?.id && conversationId) connectAbly();
    return () => {
      if (ablyRef.current) { ablyRef.current.close(); ablyRef.current = null; channelRef.current = null; }
    };
  }, [connectAbly, user?.id, conversationId]);

  useEffect(() => {
    if (scrollRef.current && !isPrependingRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    isPrependingRef.current = false;
  }, [messages]);

  const handleScroll = () => {
    if (scrollRef.current?.scrollTop === 0 && hasMore && !isFetchingMore) {
      fetchMessages(cursor);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    if (!channelRef.current || !user?.id) return;
    const now = Date.now();
    if (now - lastTypedRef.current > 2000) {
      channelRef.current.publish("typing", {
        userId: user.id,
        name: user.fullName || user.firstName || "Someone",
      });
      lastTypedRef.current = now;
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !attachment) || !conversationId || !workspaceId) return;

    const tempId = Date.now().toString();
    const optimisticMsg: any = {
      id: tempId, tempId, content: message, userId: user?.id, attachment, replyTo,
      createdAt: new Date().toISOString(),
      user: { name: user?.fullName || user?.firstName || "You", imageUrl: user?.imageUrl },
      _optimistic: true,
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setMessage(""); setAttachment(null); setReplyTo(null);

    try {
      const res = await fetch("/api/chat/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: optimisticMsg.content || "Sent an attachment",
          workspaceId, conversationId,
          attachment: optimisticMsg.attachment,
          tempId,
          replyToId: optimisticMsg.replyTo?.id,
        }),
      });
      if (!res.ok) {
        setMessages(prev => prev.filter(m => m.tempId !== tempId));
        if (res.status === 403) showUpgradePrompt("chat");
        else toast.error("Failed to send message");
      } else {
        const savedMsg = await res.json();
        setMessages(prev => prev.map(m => m.tempId === tempId ? { ...savedMsg, user: m.user } : m));
      }
    } catch {
      setMessages(prev => prev.filter(m => m.tempId !== tempId));
      toast.error("Network error");
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const res = await fetch(`/api/chat/dm?id=${messageId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Message deleted");
    } catch { toast.error("Failed to delete message"); }
  };

  const handleReactionToggle = async (messageId: string, reactionId: string) => {
    try {
      const res = await fetch("/api/chat/dm/reaction", {
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

  const handleReconnect = useCallback(() => {
    if (!user?.id || !conversationId) return;
    setReconnecting(false);
    connectAbly();
    fetchMessages();
    toast.success("Reconnected");
  }, [connectAbly, fetchMessages, user?.id, conversationId]);

  useEffect(() => {
    if (reconnecting && !isConnected) {
      const interval = setInterval(() => {
        if (!ablyRef.current || !channelRef.current) handleReconnect();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [reconnecting, isConnected, handleReconnect]);

  const isTyping = Object.keys(typingUsers).length > 0;

  if (!conversationId) return null;

  const detailsPanel = participant && showDetails && (
    <div className="w-[260px] shrink-0 border-l border-border/40 bg-background/60 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <span className="text-[12px] font-semibold text-foreground/70">Details</span>
        <button
          onClick={() => setShowDetails(false)}
          className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted/60 transition-all"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4">
        <div className="flex flex-col items-center text-center mb-6">
          {participant.imageUrl ? (
            <div className="h-16 w-16 rounded-full overflow-hidden ring-2 ring-border/40 mb-3">
              <Image src={participant.imageUrl} alt="" width={64} height={64} className="object-cover w-full h-full" />
            </div>
          ) : (
            <div className="h-16 w-16 rounded-full bg-muted/80 flex items-center justify-center text-lg font-semibold text-muted-foreground/70 mb-3 ring-2 ring-border/40">
              {(participant.name || "?").slice(0, 2).toUpperCase()}
            </div>
          )}
          <h3 className="text-[14px] font-semibold text-foreground/90">{participant.name}</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/30">
            <UserIcon className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            <span className="text-[12px] text-muted-foreground/70 truncate">{participant.name || "N/A"}</span>
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/30">
            <Mail className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            <span className="text-[12px] text-muted-foreground/70 truncate">{participant.email || "N/A"}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex bg-transparent relative overflow-hidden h-full">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-5 sm:px-7 py-3 flex items-center justify-between border-b border-border/30 z-20 shrink-0 bg-background/60">
          <div className="flex items-center gap-2.5 min-w-0">
            {onBack && (
              <button
                onClick={onBack}
                className="md:hidden h-7 w-7 rounded-[8px] flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted/60 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <div className="relative">
              {participant?.imageUrl ? (
                <div className="h-7 w-7 rounded-full overflow-hidden ring-2 ring-background shadow-sm">
                  <Image src={participant.imageUrl} alt="" width={28} height={28} className="object-cover w-full h-full" />
                </div>
              ) : (
                <div className="h-7 w-7 rounded-full bg-muted/80 flex items-center justify-center text-[10px] font-semibold text-muted-foreground/70 ring-2 ring-background shadow-sm">
                  {(participant?.name || "?").slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className={cn(
                "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                isConnected ? "bg-green-500" : "bg-gray-400"
              )} />
            </div>
            <div className="min-w-0">
              <h3 className="text-[13px] font-semibold tracking-tight leading-none text-foreground/90">
                {participant?.name || "Loading..."}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn(
                  "text-[10px] font-medium",
                  isConnected ? "text-green-600/70" : "text-muted-foreground/40"
                )}>
                  {isConnected ? "Online" : "Offline"}
                </span>
                {reconnecting && (
                  <span className="text-[10px] font-medium text-blue-500/70 animate-pulse">Reconnecting...</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className={cn(
                "h-7 w-7 rounded-[8px] flex items-center justify-center transition-all",
                showDetails
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground/30 hover:text-foreground/70 hover:bg-muted/60"
              )}
              title="Details"
            >
              <UserIcon className="h-[15px] w-[15px]" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-5 sm:px-7 py-4 space-y-1" ref={scrollRef} onScroll={handleScroll}>
          {hasMore && (
            <div className="flex justify-center py-5">
              <button
                onClick={() => fetchMessages(cursor)}
                disabled={isFetchingMore}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-all border border-border/30"
              >
                {isFetchingMore ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Load older messages
              </button>
            </div>
          )}

          {isLoading && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30">
              <Loader2 className="h-10 w-10 animate-spin mb-4" />
              <p className="text-[13px] font-medium">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30">
              <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <MessageSquare className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="text-[13px] font-medium">No messages yet.</p>
              <p className="text-[12px] text-muted-foreground/40 mt-0.5">Send a message to start the conversation.</p>
            </div>
          ) : (() => {
            const sorted = [...messages].filter(m => !m.deletedAt).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

            const formatDateLabel = (date: Date) => {
              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);
              const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
              if (d.getTime() === today.getTime()) return "Today";
              if (d.getTime() === yesterday.getTime()) return "Yesterday";
              return format(date, "EEEE, MMMM d");
            };

            const isSameDay = (a: string, b: string) => {
              const da = new Date(a), db = new Date(b);
              return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
            };

            return sorted.map((msg, idx) => {
              const currentUserId = dbUser?.id || user?.id;
              const isMe = msg.userId === currentUserId || msg.user?.id === currentUserId;
              const prevMsg = idx > 0 ? sorted[idx - 1] : null;
              const isSameSender = prevMsg && prevMsg.userId === msg.userId && !prevMsg.deletedAt;
              const showDateSeparator = idx === 0 || !isSameDay(msg.createdAt, sorted[idx - 1].createdAt);

              return (
                <React.Fragment key={msg.id || msg.tempId}>
                  {showDateSeparator && (
                    <div className="flex items-center gap-3 py-2.5 px-1">
                      <div className="flex-1 h-px bg-border/20" />
                      <span className="text-[10px] font-medium text-muted-foreground/40 shrink-0 tracking-wide">
                        {formatDateLabel(new Date(msg.createdAt))}
                      </span>
                      <div className="flex-1 h-px bg-border/20" />
                    </div>
                  )}
                  <FadeIn delay={0.02} className={cn(
                    "flex group relative",
                    isMe ? "justify-end" : "justify-start",
                    isSameSender ? "mt-[-0.875rem]" : showDateSeparator ? "mt-0" : "mt-3"
                  )}>
                    <div className={cn(
                      "absolute z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-px px-1 py-0.5 rounded-full bg-background/95 border border-border/40 shadow-lg shadow-black/[0.04] backdrop-blur-2xl",
                      isMe ? "-top-2.5 right-0" : "-top-2.5 left-9"
                    )}>
                      <button
                        className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted/60 transition-all active:scale-90"
                        title="Reply"
                        onClick={() => setReplyTo(msg)}
                      >
                        <Reply className="h-[14px] w-[14px]" />
                      </button>
                      <div className="w-px h-3.5 bg-border/20 mx-px" />
                      <button
                        className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90"
                        title="Delete"
                        onClick={() => deleteMessage(msg.id)}
                      >
                        <svg className="h-[14px] w-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div className={cn("flex gap-3 max-w-[88%] sm:max-w-[72%]", isMe ? "flex-row-reverse" : "flex-row")}>
                      {!isMe && (
                        !isSameSender ? (
                          msg.user?.imageUrl ? (
                            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full shrink-0 overflow-hidden mt-0.5 ring-2 ring-background shadow-sm">
                              <Image src={msg.user.imageUrl} alt="" width={32} height={32} className="object-cover w-full h-full" />
                            </div>
                          ) : (
                            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full shrink-0 flex items-center justify-center text-[11px] font-semibold bg-muted/80 mt-0.5 shadow-sm ring-1 ring-border/30">
                              {msg.user?.name?.slice(0, 2).toUpperCase() || "U"}
                            </div>
                          )
                        ) : (
                          <div className="w-7 sm:w-8 shrink-0" />
                        )
                      )}
                      <div className={cn("flex flex-col min-w-0", isMe ? "items-end" : "items-start")}>
                        {!isSameSender && !isMe && (
                          <span className="text-[12px] font-medium text-foreground/60 ml-1 mb-1">
                            {msg.user?.name || "Anonymous"}
                          </span>
                        )}
                        <div className={cn(
                          "relative px-[14px] py-[9px] sm:px-4 sm:py-[10px] text-sm leading-relaxed transition-all",
                          isMe
                            ? "bg-primary/[0.08] text-foreground rounded-[14px] rounded-br-[4px]"
                            : "bg-muted/50 text-foreground rounded-[14px] rounded-bl-[4px]"
                        )}>
                          {msg.replyTo && (
                            <div className={cn(
                              "mb-2 p-2 rounded-[10px] text-xs",
                              isMe ? "bg-primary/[0.06] text-foreground/60" : "bg-muted/80 text-muted-foreground"
                            )}>
                              <div className="font-medium mb-0.5 flex items-center gap-1.5">
                                <Reply className="h-3 w-3 shrink-0" /> Replying to {msg.replyTo.userId === user?.id ? "you" : (msg.replyTo.user?.name || "User")}
                              </div>
                              <span className="line-clamp-2 italic opacity-70">{msg.replyTo.content}</span>
                            </div>
                          )}
                          {msg.attachment && (() => {
                            const url = (() => {
                              try { const u = new URL(msg.attachment.url); if (u.protocol === "http:" || u.protocol === "https:") return u.href; } catch {}
                              return "#";
                            })();
                            return (
                              <div className="mb-2">
                                {msg.attachment.category === "image" ? (
                                  <a href={url} target="_blank" rel="noopener noreferrer" className="block relative h-40 sm:h-52 w-full sm:w-72 overflow-hidden rounded-xl hover:scale-[1.01] transition-transform duration-300 ring-1 ring-black/[0.04]">
                                    <Image src={url} alt="Image" fill className="object-cover" />
                                  </a>
                                ) : (
                                  <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-2.5 bg-black/[0.03] rounded-xl hover:bg-black/[0.06] transition-all">
                                    <div className="h-8 w-8 rounded-lg bg-black/[0.04] flex items-center justify-center shrink-0"><FileText className="h-3.5 w-3.5 text-muted-foreground/60" /></div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-xs font-medium truncate max-w-[120px] sm:max-w-[160px]">{msg.attachment.originalName}</span>
                                      <span className="text-[10px] text-muted-foreground/60">Document</span>
                                    </div>
                                  </a>
                                )}
                              </div>
                            );
                          })()}
                          <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                          <div className={cn(
                            "flex items-center gap-1.5 mt-0.5 select-none",
                            isMe ? "justify-end" : "justify-start"
                          )}>
                            <span className="text-[10px] leading-none text-muted-foreground/50">
                              {format(new Date(msg.createdAt), "HH:mm")}
                            </span>
                            {msg.isEdited && <span className="text-[9px] italic text-muted-foreground/40">edited</span>}
                            {isMe && <span className="text-[9px] text-muted-foreground/40">✓✓</span>}
                          </div>
                        </div>
                        {msg.reactions && typeof msg.reactions === "object" && Object.keys(msg.reactions).length > 0 && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                              <button
                                key={emoji}
                                onClick={() => handleReactionToggle(msg.id, emoji)}
                                className={cn(
                                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] transition-all",
                                  (userIds as string[]).includes(user?.id || "")
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted/60 text-muted-foreground/60 hover:bg-muted/80"
                                )}
                              >
                                <span>{emoji}</span>
                                <span>{(userIds as string[]).length}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {!isMe && (
                          <div className="mt-0.5 flex items-center gap-1">
                            {["👍", "❤️", "😂", "😮", "😢", "🙏"].slice(0, 3).map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => handleReactionToggle(msg.id, emoji)}
                                className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground/30 hover:text-foreground hover:bg-muted/60 transition-all text-[13px] opacity-0 group-hover:opacity-100"
                                title={`React with ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </FadeIn>
                </React.Fragment>
              );
            });
          })()}
        </div>

        <div className="shrink-0 border-t border-border/40 bg-background/60 z-20">
          <div className="px-5 sm:px-7 py-3.5">
            {isTyping && (
              <div className="mb-2 text-[12px] font-medium text-primary/70 flex items-center gap-2">
                <div className="flex gap-0.5">
                  <div className="h-1 w-1 bg-primary/60 rounded-full animate-bounce" />
                  <div className="h-1 w-1 bg-primary/60 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="h-1 w-1 bg-primary/60 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
                {Object.values(typingUsers)[0]?.name} typing...
              </div>
            )}

            {reconnecting && (
              <div className="mb-3 flex items-center justify-between p-3 rounded-xl bg-blue-500/6 border border-blue-500/15">
                <div className="flex items-center gap-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-xs font-medium text-blue-600">Connection lost. Reconnecting...</span>
                </div>
                <button
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-500/10 transition-colors"
                  onClick={handleReconnect}
                >
                  Retry
                </button>
              </div>
            )}

            {(replyTo || attachment) && (
              <div className="mb-3 flex flex-col gap-2">
                {replyTo && (
                  <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/10 rounded-xl">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <Reply className="h-3.5 w-3.5 text-primary shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-medium text-primary">Replying to {replyTo.user?.name}</span>
                        <span className="text-[12px] text-muted-foreground/70 truncate">{replyTo.content}</span>
                      </div>
                    </div>
                    <button
                      className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted/60 transition-all shrink-0"
                      onClick={() => setReplyTo(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {attachment && (
                  <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/10 rounded-xl">
                    <div className="flex items-center gap-3">
                      {attachment.category === "image" ? <ImageIcon className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
                      <div className="flex flex-col">
                        <span className="text-[12px] font-medium text-primary">{attachment.originalName}</span>
                        <span className="text-[10px] text-muted-foreground/60">Attached</span>
                      </div>
                    </div>
                    <button
                      className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted/60 transition-all shrink-0"
                      onClick={() => setAttachment(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={sendMessage} className="flex items-end gap-2">
              <div className="flex-1 flex items-center gap-1 px-3 py-1 bg-background rounded-full border border-border/50 focus-within:border-primary/30 focus-within:ring-[3px] focus-within:ring-primary/[0.06] transition-all">
                <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center justify-center h-7 w-7 rounded-full text-muted-foreground/40 hover:text-foreground/70 hover:bg-muted/50 transition-all shrink-0"
                    >
                      <Paperclip className="h-[15px] w-[15px]" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="rounded-xl border bg-background p-6 shadow-lg max-w-lg">
                    <DialogHeader className="mb-4">
                      <DialogTitle className="text-sm font-semibold tracking-tight">Attach File</DialogTitle>
                    </DialogHeader>
                    <FileUpload workspaceId={workspaceId} onUploadComplete={(data) => {
                      setAttachment({
                        url: data.url || data.secure_url,
                        originalName: data.originalName || "File",
                        category: (data.url || data.secure_url).match(/\.(jpeg|jpg|gif|png|webp)$/i) ? "image" : "document",
                      });
                      setIsUploadOpen(false);
                    }} />
                  </DialogContent>
                </Dialog>
                <Input
                  ref={composerRef}
                  placeholder={`Message ${participant?.name || "..."}`}
                  value={message}
                  onChange={handleInputChange}
                  className="border-none bg-transparent shadow-none focus-visible:ring-0 text-[13px] h-8 px-1 placeholder:text-muted-foreground/30"
                />
                <button
                  type="submit"
                  disabled={!message.trim() && !attachment}
                  className="flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-20 disabled:cursor-not-allowed transition-all shrink-0"
                >
                  <Send className="h-[14px] w-[14px]" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {detailsPanel}
    </div>
  );
}
