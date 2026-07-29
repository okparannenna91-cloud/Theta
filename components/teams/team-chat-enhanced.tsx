"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Hash, Pin, PinOff, MessageSquare, Reply,
  Image as ImageIcon, FileText, Paperclip, Lock, Send, Sparkles,
  X, Loader2, Maximize2, Minimize2,
  AlertCircle,
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

import TeamPresence from "@/components/teams/chat/team-presence";
import WorkspaceReactions from "@/components/teams/chat/workspace-reactions";
import ChatHeaderDashboard from "@/components/teams/chat/chat-header-dashboard";

interface TeamChatEnhancedProps {
  teamId: string;
  workspaceId: string;
}

const PAGE_SIZE = 50;

export function TeamChatEnhanced({ teamId, workspaceId }: TeamChatEnhancedProps) {
  const { user } = useUser();
  const { showUpgradePrompt } = usePopups();

  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<any>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [lastReadAt, setLastReadAt] = useState<string | null>(null);
  const [limits, setLimits] = useState({ current: 0, max: -1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [dbUser, setDbUser] = useState<any>(null);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, { name: string; timestamp: number }>>({});
  const [readReceipts, setReadReceipts] = useState<Record<string, string>>({});
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const ablyRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastReadRef = useRef<string | null>(null);
  const lastTypedRef = useRef<number>(0);
  const isPrependingRef = useRef(false);
  const fetchedRef = useRef(false);
  const retryQueue = useRef<any[]>([]);
  const composerRef = useRef<HTMLInputElement>(null);
  const scrollPositionRef = useRef<number>(0);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => setDbUser(data))
      .catch(() => {});
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
    } catch {}
  }, [teamId, workspaceId]);

  const fetchMessages = useCallback(async (cursorParam?: string | null) => {
    if (!workspaceId || !teamId || workspaceId === "undefined" || teamId === "undefined") {
      console.log("[Chat] Skipping fetch - invalid ids", { workspaceId, teamId });
      setIsLoading(false);
      return;
    }
    try {
      if (!cursorParam) {
        setIsLoading(true);
        fetchedRef.current = false;
      } else {
        setIsFetchingMore(true);
      }
      const url = `/api/chat?workspaceId=${workspaceId}&teamId=${teamId}${cursorParam ? `&cursor=${cursorParam}` : ""}&_=${Date.now()}`;
      console.log("[Chat] Fetching messages", { url });
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const errText = await res.text();
        console.error("[Chat] Fetch failed", { status: res.status, body: errText });
        throw new Error("Failed to load messages");
      }
      const data = await res.json();
      console.log("[Chat] Fetch response", { messageCount: data.messages?.length, nextCursor: data.nextCursor, hasMore: data.hasMore });
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
          console.log("[Chat] Setting messages", { count: data.messages.length, first: data.messages[0], last: data.messages[data.messages.length - 1] });
          setMessages(data.messages);
        }
        setCursor(data.nextCursor);
        setHasMore(!!data.nextCursor && data.hasMore);
        if (data.limits) setLimits(data.limits);
        if (data.lastReadAt && !cursorParam) {
          setLastReadAt(data.lastReadAt);
          lastReadRef.current = data.lastReadAt;
        }
        if (!cursorParam) {
          fetchedRef.current = true;
          markAsRead();
        }
      } else {
        console.warn("[Chat] No messages array in response", { data });
      }
    } catch (err) {
      console.error("[Chat] Failed to fetch messages:", err);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }, [teamId, workspaceId, markAsRead]);

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
      const currentUserId = dbUser?.id || user?.id;
      if (msg.data.userId === currentUserId || msg.data.user?.id === currentUserId) return;
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

    channel.subscribe("read:updated", (msg: any) => {
      const { userId: uid, timestamp } = msg.data;
      if (uid !== user?.id) setReadReceipts(prev => ({ ...prev, [uid]: timestamp }));
    });

    channel.presence.enter({ id: user?.id, name: user?.fullName || user?.firstName || "User", imageUrl: user?.imageUrl }).catch(() => {});
    channel.presence.subscribe(['enter', 'leave', 'update'], () => {
      channel.presence.get().then((members: any) => { if (members) setOnlineUsers(members.map((m: any) => m.data)); }).catch(() => {});
    });
  }, [user?.id, user?.fullName, user?.firstName, user?.imageUrl]);

  const connectAbly = useCallback(async () => {
    if (!user?.id || !teamId) return;
    try {
      setIsConnected(false);
      if (ablyRef.current) { ablyRef.current.close(); }

      const Ably = (await import("ably")).default;
      const ably = new Ably.Realtime({ authUrl: `/api/ably/token?workspaceId=${workspaceId}&teamId=${teamId}`, clientId: user.id });
      const channelName = `team:${teamId}:chat`;
      const channel = ably.channels.get(channelName);

      ably.connection.on("connected", () => {
        setIsConnected(true);
        setReconnecting(false);
      });

      ably.connection.on("disconnected", () => {
        setIsConnected(false);
      });

      ably.connection.on("suspended", () => {
        setIsConnected(false);
        setReconnecting(true);
      });

      ably.connection.on("failed", () => {
        setIsConnected(false);
        setReconnecting(true);
      });

      subscribeChannel(ably, channel);

      ablyRef.current = ably;
      channelRef.current = channel;
    } catch (error) {
      console.error("[Chat] Ably setup error:", error);
      setReconnecting(true);
    }
  }, [teamId, user?.id, subscribeChannel]);

  useEffect(() => {
    if (teamId && workspaceId && !fetchedRef.current) fetchMessages();
  }, [teamId, workspaceId, fetchMessages]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && teamId && workspaceId) {
        fetchMessages();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [teamId, workspaceId, fetchMessages]);

  useEffect(() => {
    if (user?.id && teamId) connectAbly();
    return () => {
      if (ablyRef.current) { ablyRef.current.close(); ablyRef.current = null; channelRef.current = null; }
    };
  }, [connectAbly, user?.id, teamId]);

  useEffect(() => {
    if (scrollRef.current && !isPrependingRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    isPrependingRef.current = false;
  }, [messages]);

  const handleReconnect = useCallback(() => {
    if (!user?.id || !teamId) return;
    setReconnecting(false);
    connectAbly();
    fetchMessages();
    toast.success("Reconnected");
  }, [connectAbly, fetchMessages, user?.id, teamId]);

  useEffect(() => {
    if (reconnecting && !isConnected) {
      const interval = setInterval(() => {
        if (!ablyRef.current || !channelRef.current) {
          handleReconnect();
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [reconnecting, isConnected, handleReconnect]);

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
    const timestamp = new Date().toISOString();
    const optimisticMsg: any = {
      id: tempId, tempId, content: message, userId: user?.id, attachment, replyTo,
      createdAt: timestamp,
      user: { name: user?.fullName || user?.firstName || "You", imageUrl: user?.imageUrl },
      _optimistic: true,
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setMessage(""); setAttachment(null); setReplyTo(null);

    console.log("[Chat] sendMessage: about to POST", { workspaceId, teamId, tempId, content: optimisticMsg.content?.slice(0, 30) });
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: optimisticMsg.content || "Sent an attachment",
          workspaceId, teamId,
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
        markAsRead();
      }
    } catch {
      setMessages(prev => prev.filter(m => m.tempId !== tempId));
      retryQueue.current.push(optimisticMsg);
      toast.error("Network error. Your message will be retried.", { action: { label: "Retry", onClick: () => sendQueued() } });
    }
  };

  const sendQueued = async () => {
    if (retryQueue.current.length === 0) return;
    const msg = retryQueue.current.shift();
    setMessages(prev => [...prev, { ...msg, id: Date.now().toString() + "-retry" }]);
    setMessage(msg.content || "");
    if (msg.attachment) setAttachment(msg.attachment);
    if (msg.replyTo) setReplyTo(msg.replyTo);
    toast.success("Retrying message...");
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const res = await fetch(`/api/chat?id=${messageId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Message deleted");
    } catch { toast.error("Failed to delete message"); }
  };

  const togglePin = async (msg: any) => {
    try {
      await fetch(`/api/chat?id=${msg.id}&workspaceId=${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !msg.isPinned })
      });
      toast.success(msg.isPinned ? "Unpinned" : "Pinned");
    } catch { toast.error("Failed to update pin"); }
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

  const toggleFullScreen = () => {
    if (!isFullScreen) {
      scrollPositionRef.current = scrollRef.current?.scrollTop || 0;
    }
    setIsFullScreen(!isFullScreen);
  };

  useEffect(() => {
    if (isFullScreen && scrollRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current!.scrollTop = scrollPositionRef.current;
      });
    }
  }, [isFullScreen]);

  const pinnedMessages = useMemo(() => messages.filter(m => m.isPinned && !m.deletedAt), [messages]);

  const latestSeenMessageMap: Record<string, string[]> = {};
  Object.entries(readReceipts).forEach(([uid, t]) => {
    let lastSeenMsgId = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].createdAt <= t) { lastSeenMsgId = messages[i].id; break; }
    }
    if (lastSeenMsgId) {
      if (!latestSeenMessageMap[lastSeenMsgId]) latestSeenMessageMap[lastSeenMsgId] = [];
      latestSeenMessageMap[lastSeenMsgId].push(uid);
    }
  });

  const chatContent = (
      <div className="flex bg-transparent relative overflow-hidden h-full">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-5 sm:px-7 py-4 flex items-center justify-between border-b border-border/50 z-20 shrink-0 bg-background/80">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                <Hash className="h-[18px] w-[18px] text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold tracking-tight leading-none text-foreground">Team Chat</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <TeamPresence onlineUsers={onlineUsers} />
                  {!isConnected && (
                    <span className="text-[11px] font-medium text-amber-500">Disconnected</span>
                  )}
                  {reconnecting && (
                    <span className="text-[11px] font-medium text-blue-500 animate-pulse">Reconnecting...</span>
                  )}
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <ChatHeaderDashboard workspaceId={workspaceId} teamId={teamId} />
            </div>

            <div className="flex items-center gap-1 ml-3">
              {pinnedMessages.length > 0 && (
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-amber-500 bg-amber-500/8 hover:bg-amber-500/12 transition-colors">
                  <Pin className="h-3 w-3" /> {pinnedMessages.length}
                </button>
              )}
              <button className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-all" onClick={toggleFullScreen} title={isFullScreen ? "Exit full screen" : "Full screen"}>
                {isFullScreen ? <Minimize2 className="h-[18px] w-[18px]" /> : <Maximize2 className="h-[18px] w-[18px]" />}
              </button>
            </div>
          </div>

        {pinnedMessages.length > 0 && (
          <div className="bg-amber-500/4 border-b border-amber-500/8 z-10 shrink-0">
            {pinnedMessages.slice(0, 3).map(msg => (
              <div key={msg.id} className="px-5 sm:px-7 py-2.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Pin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="text-[13px] text-amber-600/70 truncate">{msg.content}</span>
                </div>
                <button className="h-6 w-6 rounded-md flex items-center justify-center text-amber-400/50 hover:text-amber-500 hover:bg-amber-500/10 transition-all shrink-0" onClick={() => togglePin(msg)}>
                  <PinOff className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className={cn(
          "flex-1 overflow-y-auto no-scrollbar",
          isFullScreen ? "px-7 sm:px-9 py-5 space-y-1" : "px-5 sm:px-7 py-4 space-y-1"
        )} ref={scrollRef} onScroll={handleScroll}>
          {hasMore && (
            <div className="flex justify-center py-5">
              <button onClick={() => fetchMessages(cursor)} disabled={isFetchingMore} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-all border border-border/30">
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
              <p className="text-[12px] text-muted-foreground/40 mt-0.5">Send a message to get started.</p>
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

            let unreadIndex = -1;
            if (lastReadRef.current) {
              const lastRead = new Date(lastReadRef.current).getTime();
              unreadIndex = sorted.findIndex(m => new Date(m.createdAt).getTime() > lastRead);
            }

            return sorted.map((msg, idx) => {
              const currentUserId = dbUser?.id || user?.id;
              const isMe = msg.userId === currentUserId || msg.user?.id === currentUserId;
              const prevMsg = idx > 0 ? sorted[idx - 1] : null;
              const isSameSender = prevMsg && prevMsg.userId === msg.userId && !prevMsg.deletedAt;
              const showDateSeparator = idx === 0 || !isSameDay(msg.createdAt, sorted[idx - 1].createdAt);
              const showUnread = unreadIndex >= 0 && idx === unreadIndex;

              return (
                <React.Fragment key={msg.id || msg.tempId}>
                  {showDateSeparator && (
                    <div className="flex items-center gap-3 py-3 px-1">
                      <div className="flex-1 h-px bg-border/30" />
                      <span className="text-[11px] font-medium text-muted-foreground/50 shrink-0">{formatDateLabel(new Date(msg.createdAt))}</span>
                      <div className="flex-1 h-px bg-border/30" />
                    </div>
                  )}
                  {showUnread && (
                    <div className="flex items-center gap-3 py-2 px-1" id="unread-divider">
                      <div className="flex-1 h-px bg-primary/20" />
                      <span className="text-[10px] font-semibold text-primary/60 uppercase tracking-wider">Unread</span>
                      <div className="flex-1 h-px bg-primary/20" />
                    </div>
                  )}
                  <FadeIn delay={0.02} className={cn(
                    "flex group relative",
                    isMe ? "justify-end" : "justify-start",
                    isSameSender ? "mt-[-0.875rem]" : showDateSeparator ? "mt-0" : "mt-3"
                  )}>
                    {/* Hover actions bar */}
                    <div className={cn(
                      "absolute top-0 z-10 hidden group-hover:flex items-center gap-0.5 px-1 py-0.5 rounded-xl bg-background/90 border border-border/50 shadow-sm backdrop-blur-xl",
                      isMe ? "-top-3 right-0" : "-top-3 left-9"
                    )}>
                      <button className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-all" title="Reply" onClick={() => setReplyTo(msg)}>
                        <Reply className="h-3.5 w-3.5" />
                      </button>
                      <button className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-all" title="React">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </button>
                      <button className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-all" title="Edit" onClick={() => {}}>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      {msg.isPinned ? (
                        <button className="h-7 w-7 rounded-lg flex items-center justify-center text-amber-500/70 hover:text-amber-500 hover:bg-amber-500/10 transition-all" title="Unpin" onClick={() => togglePin(msg)}>
                          <PinOff className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-all" title="Pin" onClick={() => togglePin(msg)}>
                          <Pin className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <div className="w-px h-4 bg-border/30 mx-0.5" />
                      <button className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 transition-all" title="Delete" onClick={() => deleteMessage(msg.id)}>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
                          "relative px-4 py-[10px] sm:px-5 sm:py-3 text-sm leading-relaxed shadow-sm transition-all",
                          isMe
                            ? "bg-primary text-primary-foreground rounded-[18px] rounded-br-[6px]"
                            : "bg-card text-card-foreground rounded-[18px] rounded-bl-[6px] border border-border/40"
                        )}>
                          {msg.replyTo && (
                            <div className={cn(
                              "mb-2.5 p-2.5 rounded-xl text-xs border-l-[3px]",
                              isMe ? "bg-white/8 border-white/30 text-white/70" : "bg-muted/60 border-primary/30 text-muted-foreground"
                            )}>
                              <div className="font-medium mb-0.5 flex items-center gap-1.5">
                                <Reply className="h-3 w-3 shrink-0" /> Replying to {msg.replyTo.userId === user?.id ? "you" : (msg.replyTo.user?.name || "User")}
                              </div>
                              <span className="line-clamp-2 italic opacity-80">{msg.replyTo.content}</span>
                            </div>
                          )}
                          {msg.attachment && (() => {
                            const url = (() => {
                              try { const u = new URL(msg.attachment.url); if (u.protocol === "http:" || u.protocol === "https:") return u.href; } catch {}
                              return "#";
                            })();
                            return (
                              <div className="mb-2.5">
                                {msg.attachment.category === "image" ? (
                                  <a href={url} target="_blank" rel="noopener noreferrer" className="block relative h-40 sm:h-52 w-full sm:w-72 overflow-hidden rounded-2xl border hover:scale-[1.01] transition-transform duration-300">
                                    <Image src={url} alt="Image" fill className="object-cover" />
                                  </a>
                                ) : (
                                  <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-2.5 bg-black/[0.04] rounded-xl hover:bg-black/[0.08] transition-all">
                                    <div className="h-8 w-8 rounded-lg bg-black/[0.06] flex items-center justify-center shrink-0"><FileText className="h-3.5 w-3.5 text-muted-foreground" /></div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-xs font-medium truncate max-w-[120px] sm:max-w-[160px]">{msg.attachment.originalName}</span>
                                      <span className="text-[10px] text-muted-foreground">Document</span>
                                    </div>
                                  </a>
                                )}
                              </div>
                            );
                          })()}
                          <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                          <div className={cn(
                            "flex items-center gap-1.5 mt-1 -mb-0.5 select-none",
                            isMe ? "justify-end" : "justify-start"
                          )}>
                            <span className={cn(
                              "text-[10px] leading-none",
                              isMe ? "text-primary-foreground/50" : "text-muted-foreground/60"
                            )}>
                              {format(new Date(msg.createdAt), "HH:mm")}
                            </span>
                            {msg.isEdited && <span className="text-[9px] italic text-muted-foreground/50">edited</span>}
                            {msg.isPinned && <Pin className="h-2.5 w-2.5 text-amber-400/70" />}
                            {isMe && <span className="text-[9px] text-primary-foreground/40">✓✓</span>}
                          </div>
                        </div>
                        {msg.userId !== user?.id && (
                          <div className="mt-0.5">
                            <WorkspaceReactions
                              messageId={msg.id}
                              reactions={msg.reactions}
                              currentUserId={user?.id}
                              onReactionToggle={handleReactionToggle}
                            />
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
            {Object.keys(typingUsers).length > 0 && (
              <div className="mb-2 text-[12px] font-medium text-primary/70 flex items-center gap-2">
                <div className="flex gap-0.5">
                  <div className="h-1 w-1 bg-primary/60 rounded-full animate-bounce" />
                  <div className="h-1 w-1 bg-primary/60 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="h-1 w-1 bg-primary/60 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
                {Object.values(typingUsers)[0].name} typing...
              </div>
            )}

            {reconnecting && (
              <div className="mb-3 flex items-center justify-between p-3 rounded-xl bg-blue-500/6 border border-blue-500/15">
                <div className="flex items-center gap-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-xs font-medium text-blue-600">Connection lost. Reconnecting...</span>
                </div>
                <button className="text-xs font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-500/10 transition-colors" onClick={handleReconnect}>
                  Retry
                </button>
              </div>
            )}

            {retryQueue.current.length > 0 && (
              <div className="mb-3 flex items-center justify-between p-3 rounded-xl bg-amber-500/6 border border-amber-500/15">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-medium text-amber-600">{retryQueue.current.length} message(s) pending</span>
                </div>
                <button className="text-xs font-medium text-amber-600 hover:text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-500/10 transition-colors" onClick={sendQueued}>
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
                    <button className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted/60 transition-all shrink-0" onClick={() => setReplyTo(null)}><X className="h-3.5 w-3.5" /></button>
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
                    <button className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted/60 transition-all shrink-0" onClick={() => setAttachment(null)}><X className="h-3.5 w-3.5" /></button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={sendMessage} className="flex items-end gap-2">
              <div className="flex-1 flex items-center gap-1.5 px-3 py-1.5 bg-background rounded-2xl border border-border/60 focus-within:border-primary/30 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] transition-all shadow-sm">
                <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                  <DialogTrigger asChild>
                    <button type="button" className="flex items-center justify-center h-8 w-8 rounded-xl text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-all shrink-0" disabled={!isConnected}>
                      <Paperclip className="h-[18px] w-[18px]" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="rounded-2xl border bg-background p-6 sm:p-8 shadow-lg max-w-lg">
                    <DialogHeader className="mb-5">
                      <DialogTitle className="text-base font-semibold tracking-tight">Attach File</DialogTitle>
                    </DialogHeader>
                    <FileUpload workspaceId={workspaceId} onUploadComplete={(data) => {
                      setAttachment({
                        url: data.url || data.secure_url,
                        originalName: data.originalName || "File",
                        category: (data.url || data.secure_url).match(/\.(jpeg|jpg|gif|png|webp)$/i) ? "image" : "document"
                      });
                      setIsUploadOpen(false);
                    }} />
                  </DialogContent>
                </Dialog>
                <Input
                  ref={composerRef}
                  placeholder={isLimitReached ? "Message limit reached" : "Type a message..."}
                  value={message} onChange={handleInputChange}
                  className="border-none bg-transparent shadow-none focus-visible:ring-0 text-sm h-9 px-1 placeholder:text-muted-foreground/40"
                  disabled={!isConnected || isLimitReached}
                />
                <button type="submit" disabled={!isConnected || isLimitReached || (!message.trim() && !attachment)} className="flex items-center justify-center h-8 w-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0 shadow-sm">
                  {isLimitReached ? <Lock className="h-[16px] w-[16px]" /> : <Send className="h-[16px] w-[16px]" />}
                </button>
              </div>
            </form>

            {isLimitReached && (
              <FadeIn delay={0.1} className="mt-4 flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center">
                    <Sparkles className="h-[18px] w-[18px] text-white" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-[13px] font-semibold tracking-tight">Team Chat</h4>
                    <p className="text-[12px] text-white/60">Unlock unlimited messaging</p>
                  </div>
                </div>
                <button className="h-9 px-5 rounded-xl font-medium text-[12px] bg-white text-primary hover:bg-white/90 transition-all shadow-sm" onClick={() => showUpgradePrompt("chat")}>Upgrade</button>
              </FadeIn>
            )}
          </div>
        </div>
      </div>


    </div>
  );

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background flex flex-col">
        <div className="flex-1 overflow-hidden">
          {chatContent}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      {chatContent}
    </div>
  );
}
