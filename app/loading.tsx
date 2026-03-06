import { LiquidLoader } from "@/components/ui/liquid-loader";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <LiquidLoader
        text="Preparing Theta PM Workspace..."
        fullscreen={false}
      />
    </div>
  );
}

