import { NextResponse } from "next/server";
import { getExchangeRate } from "@/lib/currency";

export async function GET() {
    try {
        const rate = await getExchangeRate();
        return NextResponse.json({ rate });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch exchange rate" }, { status: 500 });
    }
}
