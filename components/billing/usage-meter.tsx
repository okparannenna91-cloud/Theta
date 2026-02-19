"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface UsageMeterProps {
    label: string;
    current: number;
    max: number;
    percentage: number;
    warning: "ok" | "warning" | "critical";
    unit?: string;
}

export function UsageMeter({ label, current, max, percentage, warning, unit = "" }: UsageMeterProps) {
    const isUnlimited = max === -1;

    const getColor = () => {
        if (isUnlimited) return "bg-blue-500";
        if (warning === "critical") return "bg-red-500";
        if (warning === "warning") return "bg-yellow-500";
        return "bg-green-500";
    };

    const getTextColor = () => {
        if (isUnlimited) return "text-blue-600";
        if (warning === "critical") return "text-red-600";
        if (warning === "warning") return "text-yellow-600";
        return "text-green-600";
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{label}</span>
                <span className={cn("text-sm font-semibold", getTextColor())}>
                    {isUnlimited ? (
                        "Unlimited"
                    ) : (
                        <>
                            {current.toLocaleString()}{unit} / {max.toLocaleString()}{unit}
                        </>
                    )}
                </span>
            </div>
            {!isUnlimited && (
                <>
                    <Progress value={percentage} className="h-2" indicatorClassName={getColor()} />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{percentage}% used</span>
                        {warning === "warning" && (
                            <span className="text-yellow-600 font-medium">Approaching limit</span>
                        )}
                        {warning === "critical" && (
                            <span className="text-red-600 font-medium">Limit reached</span>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
