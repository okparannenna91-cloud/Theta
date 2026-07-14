import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg" | "xl";

const sizeMap: Record<LogoSize, { icon: number; wordmark: string; container: string }> = {
  sm: { icon: 22, wordmark: "text-base", container: "h-7 w-7" },
  md: { icon: 28, wordmark: "text-lg", container: "h-9 w-9" },
  lg: { icon: 36, wordmark: "text-xl", container: "h-11 w-11" },
  xl: { icon: 48, wordmark: "text-2xl", container: "h-14 w-14" },
};

interface LogoProps {
  size?: LogoSize | number;
  showWordmark?: boolean;
  href?: string;
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
  linkClassName?: string;
  priority?: boolean;
  /** When true, wraps icon in a rounded container with bg-primary/20 */
  container?: boolean;
}

export function Logo({
  size = "md",
  showWordmark = true,
  href,
  className,
  iconClassName,
  wordmarkClassName,
  linkClassName,
  priority = false,
  container = false,
}: LogoProps) {
  const iconSize = typeof size === "number" ? size : sizeMap[size].icon;
  const wordmarkClass = typeof size === "number" ? "text-lg" : sizeMap[size].wordmark;
  const containerClass = typeof size === "number" ? "h-8 w-8" : sizeMap[size].container;

  const icon = container ? (
    <div className={cn(containerClass, "rounded-lg overflow-hidden flex-shrink-0 bg-primary/20 flex items-center justify-center")}>
      <Image
        src="/Logo.png"
        alt="Theta"
        width={iconSize}
        height={iconSize}
        priority={priority}
        className={cn("object-cover", iconClassName)}
      />
    </div>
  ) : (
    <Image
      src="/Logo.png"
      alt="Theta"
      width={iconSize}
      height={iconSize}
      priority={priority}
      className={cn("rounded", iconClassName)}
    />
  );

  const content = (
    <div className={cn("flex items-center gap-2", className)}>
      {icon}
      {showWordmark && (
        <span className={cn("font-semibold text-foreground", wordmarkClass, wordmarkClassName)}>
          Theta
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className={cn("flex items-center", linkClassName)}>
        {content}
      </Link>
    );
  }

  return content;
}
