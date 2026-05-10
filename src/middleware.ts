import { auth } from '@/lib/auth';

export default auth((req) => {
  const path = req.nextUrl.pathname;

  // Public routes - no auth required
  const isPublic =
    path === '/' ||                                    // Landing page
    path === '/v2' ||                                  // Alternate landing page
    path.startsWith('/auth/') ||                       // Sign in/sign up pages
    path.startsWith('/api/auth/') ||                   // NextAuth internal routes (session, callback, csrf, etc.)
    path.startsWith('/api/v1/auth/') ||                // Auth endpoints handle their own auth
    path === '/api/v1/health' ||                        // Health check - intentionally public
    path.startsWith('/_next/') ||                       // Next.js static files
    path === '/favicon.ico';

  if (isPublic) return;

  // All other routes require authentication
  if (!req.auth) {
    return Response.redirect(new URL('/auth/signin', req.url));
  }
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};