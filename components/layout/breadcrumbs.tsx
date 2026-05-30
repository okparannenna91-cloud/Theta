"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export function Breadcrumbs() {
    const pathname = usePathname();
    const paths = pathname.split("/").filter((path) => path !== "");

    if (paths.length === 0) return null;

    return (
        <nav className="flex items-center space-x-2 text-xs font-medium text-muted-foreground mb-4">
            <Link
                href="/dashboard"
                className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
                <Home className="h-3 w-3" />
            </Link>
            {paths.map((path, index) => {
                const href = `/${paths.slice(0, index + 1).join("/")}`;
                const isLast = index === paths.length - 1;
                const name = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, " ");

                // Ignore technical IDs in breadcrumbs if possible, or format them
                // For now just basic formatting

                return (
                    <React.Fragment key={path}>
                        <ChevronRight className="h-3 w-3 flex-shrink-0 opacity-50" />
                        {isLast ? (
                            <span className="text-foreground font-semibold truncate max-w-[150px]">
                                {name}
                            </span>
                        ) : (
                            <Link
                                href={href}
                                className="hover:text-foreground transition-colors truncate max-w-[150px]"
                            >
                                {name}
                            </Link>
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
}


