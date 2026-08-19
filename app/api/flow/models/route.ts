import { NextResponse } from "next/server";
import { getBridgeModels, isBridgeEnabled, validateBridgeSecret } from "@/lib/nova/bridge";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isBridgeEnabled()) {
    return NextResponse.json({ error: "Flow³ bridge is disabled (FLOW_BRIDGE_ENABLED)." }, { status: 503 });
  }
  if (!validateBridgeSecret(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({
    object: "list",
    data: getBridgeModels().map((m) => ({ id: m.id, name: m.name, description: m.description })),
  });
}