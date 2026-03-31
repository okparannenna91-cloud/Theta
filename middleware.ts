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
]);

const limiter = rateLimit({
  interval: 60 * 1000, // 60 seconds
  uniqueTokenPerInterval: 500, // Max 500 users
});

export default clerkMiddleware(async (auth, req) => {
  // ── Canonical domain enforcement ────────────────────────────────────────
  // Redirect thetapm.site (non-www) → https://www.thetapm.site permanently.
  // Must run BEFORE auth so Clerk doesn't add its own redirect on top.
  const host = req.headers.get('host') ?? '';
  if (host === 'thetapm.site' || host === 'http://thetapm.site') {
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
      await limiter.check(null, 30, ip); // Limit to 30 requests per minute
    } catch {
      return new NextResponse('Too Many Requests', {
        status: 429,
        statusText: 'Too Many Requests'
      });
    }
  }

  if (!isPublicRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    '/((?!.*\\..*|_next).*)',
    '/',
    '/(api|trpc)(.*)',
  ],
};
