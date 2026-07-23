import { NextResponse } from "next/server";

const COORDINATES: Record<string, { lat: number; lng: number }> = {
  "new york": { lat: 40.7128, lng: -74.006 },
  "london": { lat: 51.5074, lng: -0.1278 },
  "tokyo": { lat: 35.6762, lng: 139.6503 },
  "sydney": { lat: -33.8688, lng: 151.2093 },
  "berlin": { lat: 52.52, lng: 13.405 },
  "paris": { lat: 48.8566, lng: 2.3522 },
  "mumbai": { lat: 19.076, lng: 72.8777 },
  "shanghai": { lat: 31.2304, lng: 121.4737 },
  "san francisco": { lat: 37.7749, lng: -122.4194 },
  "los angeles": { lat: 34.0522, lng: -118.2437 },
  "chicago": { lat: 41.8781, lng: -87.6298 },
  "seattle": { lat: 47.6062, lng: -122.3321 },
  "austin": { lat: 30.2672, lng: -97.7431 },
  "toronto": { lat: 43.6532, lng: -79.3832 },
  "vancouver": { lat: 49.2827, lng: -123.1207 },
  "dubai": { lat: 25.2048, lng: 55.2708 },
  "singapore": { lat: 1.3521, lng: 103.8198 },
  "amsterdam": { lat: 52.3676, lng: 4.9041 },
  "barcelona": { lat: 41.3874, lng: 2.1686 },
  "rome": { lat: 41.9028, lng: 12.4964 },
  "beijing": { lat: 39.9042, lng: 116.4074 },
  "seoul": { lat: 37.5665, lng: 126.978 },
  "mexico city": { lat: 19.4326, lng: -99.1332 },
  "sao paulo": { lat: -23.5505, lng: -46.6333 },
  "delhi": { lat: 28.7041, lng: 77.1025 },
  "bangalore": { lat: 12.9716, lng: 77.5946 },
  "hong kong": { lat: 22.3193, lng: 114.1694 },
  "kuala lumpur": { lat: 3.139, lng: 101.6869 },
  "cape town": { lat: -33.9249, lng: 18.4241 },
  "lagos": { lat: 6.5244, lng: 3.3792 },
  "nairobi": { lat: -1.2921, lng: 36.8219 },
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    if (!q || !q.trim()) {
      return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 });
    }

    const query = q.trim().toLowerCase();
    const cached = COORDINATES[query] || COORDINATES[query.split(",")[0]?.trim()];
    if (cached) {
      return NextResponse.json({ lat: cached.lat, lng: cached.lng, source: "cache" });
    }

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
      { headers: { "User-Agent": "ThetaApp/1.0" } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
    }

    const data = await res.json();
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    return NextResponse.json({
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      source: "nominatim",
      displayName: data[0].display_name,
    });
  } catch (error) {
    console.error("Geocoding error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
