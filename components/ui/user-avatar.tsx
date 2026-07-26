"use client";

import { cn } from "@/lib/utils";

interface UserAvatarProps {
  imageUrl?: string | null;
  name?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-5 w-5 text-[9px]",
  md: "h-7 w-7 text-xs",
  lg: "h-9 w-9 text-sm",
};

export function UserAvatar({ imageUrl, name, className, size = "sm" }: UserAvatarProps) {
  const initials = (name || "")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  if (imageUrl) {
    return (
      <div className={cn("relative flex shrink-0 overflow-hidden rounded-full", sizeMap[size], "ring-1 ring-background", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={name || ""} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center rounded-full bg-muted", sizeMap[size], "ring-1 ring-background font-medium", className)}>
      {initials}
    </div>
  );
}
