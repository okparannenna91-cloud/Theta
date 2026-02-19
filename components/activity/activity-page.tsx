"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity as ActivityIcon } from "lucide-react";
import { format } from "date-fns";

async function fetchActivity() {
  const res = await fetch("/api/activity");
  if (!res.ok) throw new Error("Failed to fetch activity");
  return res.json();
}

export default function ActivityPage() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["activity"],
    queryFn: fetchActivity,
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-8 w-48 sm:w-64 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-6 lg:mb-8"
      >
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Activity Log</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Track all activities across your projects
        </p>
      </motion.div>

      <div className="space-y-4">
        {activities?.map((activity: any, i: number) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <ActivityIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base break-words">{activity.action}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground break-all">
                      {activity.entityType}: {activity.entityId}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(activity.createdAt), "PPp")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {activities?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No activity yet.</p>
        </div>
      )}
    </div>
  );
}

