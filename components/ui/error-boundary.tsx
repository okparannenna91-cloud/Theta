"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <div className="flex items-center justify-center min-h-[400px] p-8">
                    <div className="text-center max-w-md">
                        <div className="text-4xl mb-4">⚠️</div>
                        <h2 className="text-lg font-semibold text-foreground mb-2">Something went wrong</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            {this.state.error?.message || "An unexpected error occurred"}
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => {
                                this.setState({ hasError: false, error: null });
                                window.location.reload();
                            }}
                        >
                            Try again
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
