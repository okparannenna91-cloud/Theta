import { NextResponse } from "next/server";
import { z } from "zod";

const logSchema = z.object({
    message: z.string(),
    stack: z.string().optional(),
    componentStack: z.string().optional(),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const data = logSchema.parse(body);
        console.error("[client-error] message:", data.message);
        console.error("[client-error] stack:", data.stack || "(no stack)");
        console.error("[client-error] componentStack:", data.componentStack || "(no component stack)");
        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json({ ok: false }, { status: 400 });
    }
}