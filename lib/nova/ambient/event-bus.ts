import type { WorkspaceEvent, EventHandler } from "./types";
import { logger } from "@/lib/logger";

type EventType = string;

export class NovaEventBus {
  private static instance: NovaEventBus;
  private handlers: Map<EventType, Set<EventHandler>> = new Map();
  private wildcardHandlers: Set<EventHandler> = new Set();
  private history: WorkspaceEvent[] = [];
  private readonly MAX_HISTORY = 200;

  static getInstance(): NovaEventBus {
    if (!NovaEventBus.instance) {
      NovaEventBus.instance = new NovaEventBus();
    }
    return NovaEventBus.instance;
  }

  on(eventType: EventType, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  onAny(handler: EventHandler): void {
    this.wildcardHandlers.add(handler);
  }

  off(eventType: EventType, handler: EventHandler): void {
    this.handlers.get(eventType)?.delete(handler);
  }

  offAny(handler: EventHandler): void {
    this.wildcardHandlers.delete(handler);
  }

  async emit(event: WorkspaceEvent): Promise<void> {
    logger.debug("[NovaEventBus] Emitting event", { type: event.type, workspaceId: event.workspaceId });

    this.history.push(event);
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }

    const specificHandlers = this.handlers.get(event.type) || new Set();
    const allHandlers = [...specificHandlers, ...this.wildcardHandlers];

    if (allHandlers.length === 0) return;

    const results = await Promise.allSettled(
      allHandlers.map((handler) => {
        try {
          return Promise.resolve(handler(event));
        } catch (error: any) {
          return Promise.reject(error);
        }
      })
    );

    for (const result of results) {
      if (result.status === "rejected") {
        logger.warn("[NovaEventBus] Handler failed:", result.reason);
      }
    }
  }

  getHistory(eventType?: EventType): WorkspaceEvent[] {
    if (eventType) {
      return this.history.filter((e) => e.type === eventType);
    }
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }
}
