import { NextResponse } from 'next/server';

// GET /api/storyblok/preview?slug=...&path=...
// Fetches draft content from Storyblok using the preview token
// This endpoint is server-side only - the preview token is never exposed to the browser

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const path = searchParams.get('path');
  const version = searchParams.get('version') || 'draft';

  if (!slug && !path) {
    return NextResponse.json(
      { error: 'Either slug or path parameter is required' },
      { status: 400 }
    );
  }

  // Import here to avoid issues at runtime
  const storyblok = await import('../../../lib/storyblok');

  // Always use draft version for preview, with preview token
  const data = await storyblok.default.fetchStoryblokContent(
    slug || path || '',
    { version: version as 'draft' | 'published' }
  );

  if (!data) {
    return NextResponse.json(
      { error: 'Storyblok content not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ story: data });
}

// POST /api/storyblok/preview
// Alternative endpoint for POST requests with body
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slug, path } = body;

    if (!slug && !path) {
      return NextResponse.json(
        { error: 'Either slug or path is required' },
        { status: 400 }
      );
    }

    const storyblok = await import('../../../lib/storyblok');
    const data = await storyblok.default.fetchStoryblokContent(
      slug || path,
      { version: 'draft' }
    );

    if (!data) {
      return NextResponse.json(
        { error: 'Storyblok content not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ story: data });
  } catch (error) {
    console.error('Storyblok preview POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
