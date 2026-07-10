import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { rateLimit } from './lib/rate-limit';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/docs(.*)',
  '/privacy',
  '/terms',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/user/preferences(.*)',
]);

const limiter = rateLimit({
  interval: 60 * 1000, // 60 seconds
  uniqueTokenPerInterval: 500, // Max 500 users
});

export default clerkMiddleware(async (auth, req) => {
  const start = Date.now();

  // ── Canonical domain enforcement ────────────────────────────────────────
  const host = req.headers.get('host') ?? '';
  if (host === 'thetapm.site' || host === 'thetapm.site:3000') {
    const url = req.nextUrl.clone();
    url.protocol = 'https:';
    url.host = 'www.thetapm.site';
    return NextResponse.redirect(url, { status: 308 });
  }
  // ────────────────────────────────────────────────────────────────────────

  // Rate limiting for API routes
  if (req.nextUrl.pathname.startsWith('/api')) {
    const ip = req.ip || req.headers.get('x-forwarded-for') || '127.0.0.1';
    try {
      await limiter.check(null, 30, ip);
    } catch {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }
  }

  if (!isPublicRoute(req)) {
    auth().protect();
  }

  const elapsed = Date.now() - start;
  if (elapsed > 100) {
    console.warn(`[Middleware] Slow request: ${req.nextUrl.pathname} took ${elapsed}ms`);
  }
});

export const config = {
  matcher: [
    '/((?!.*\\..*|_next).*)',
    '/',
    '/(api|trpc)(.*)',
  ],
};
