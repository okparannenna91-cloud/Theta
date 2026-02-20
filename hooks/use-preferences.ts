import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTheme } from "next-themes";

export function usePreferences() {
    const queryClient = useQueryClient();
    const { setTheme } = useTheme();

    const { data: preferences, isLoading } = useQuery({
        queryKey: ["user-preferences"],
        queryFn: async () => {
            const res = await fetch("/api/user/preferences");
            if (!res.ok) throw new Error("Failed to fetch preferences");
            return res.json();
        },
    });

    const updatePreferenceMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch("/api/user/preferences", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to update preferences");
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.setQueryData(["user-preferences"], data);
        },
    });

    // Apply theme whenever it loads or changes in DB
    useEffect(() => {
        if (preferences?.theme) {
            setTheme(preferences.theme);
        }
    }, [preferences?.theme, setTheme]);

    return {
        preferences,
        isLoading,
        updatePreference: updatePreferenceMutation.mutate,
        isUpdating: updatePreferenceMutation.isPending,
    };
}
