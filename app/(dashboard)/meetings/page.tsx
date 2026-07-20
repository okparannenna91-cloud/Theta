"use client";

import { MeetingList } from "@/components/meetings/meeting-list";
import { CalendarCheck } from "lucide-react";

export default function MeetingsPage() {
  return (
    <div className="h-full flex flex-col bg-background">
      <div className="px-6 lg:px-8 py-4 border-b bg-background/80 backdrop-blur-sm">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            Meetings
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI-powered meeting intelligence with agenda generation and post-briefs
          </p>
        </div>
      </div>

      <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <MeetingList />
        </div>
      </div>
    </div>
  );
}
