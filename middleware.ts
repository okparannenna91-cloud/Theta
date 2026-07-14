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
  '/onboarding',
  '/api/user/preferences(.*)',
]);

const isApiRoute = createRouteMatcher([
  '/api(.*)',
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
  if (isApiRoute(req)) {
    const ip = req.ip || req.headers.get('x-forwarded-for') || '127.0.0.1';
    try {
      await limiter.check(null, 30, ip);
    } catch {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }
  }

  if (!isPublicRoute(req)) {
    const session = auth();
    if (!session.userId) {
      // API routes → return JSON 401 so the client can handle it gracefully
      if (isApiRoute(req)) {
        return NextResponse.json(
          { error: "Unauthorized", code: "auth/session-expired" },
          { status: 401 }
        );
      }
      // Page routes → redirect to sign-in preserving the intended URL
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.nextUrl.pathname + req.nextUrl.search);
      return NextResponse.redirect(signInUrl);
    }
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
