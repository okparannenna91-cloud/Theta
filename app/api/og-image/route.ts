import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "Theta PM";
  const description = searchParams.get("description") || "Project Management for High-Velocity Teams";
  const bgColor = searchParams.get("bg") || "000000";
  const textColor = searchParams.get("text") || "ffffff";

  const width = 1200;
  const height = 630;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="#${bgColor}"/>
    <text x="${width / 2}" y="${height / 2 - 20}" text-anchor="middle" fill="#${textColor}" font-size="48" font-weight="bold" font-family="system-ui, sans-serif">${title}</text>
    <text x="${width / 2}" y="${height / 2 + 30}" text-anchor="middle" fill="#${textColor}" font-size="24" font-family="system-ui, sans-serif" opacity="0.7">${description}</text>
  </svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
