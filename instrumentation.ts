export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initializeAmbientNova } = await import("@/lib/nova/ambient");

    const onServerless = process.env.VERCEL === "1";
    initializeAmbientNova({
      autoStartBackgroundAgent: !onServerless,
      startGlobalHeartbeat: !onServerless,
    });
  }
}
