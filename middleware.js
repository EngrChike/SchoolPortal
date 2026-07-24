import { NextResponse } from 'next/server'

export function middleware(request) {
  const path = request.nextUrl.pathname

  // Define protected admin routes
  const protectedAdminPaths = ['/manage-teachers', '/manage-students', '/admin', '/dashboard', '/admin-dashboard'];
  const isAdminRoute = protectedAdminPaths.some((route) => path.startsWith(route));

  if (isAdminRoute) {
    const adminEmailCookie = request.cookies.get('active_admin_email')?.value;

    if (!adminEmailCookie) {
      const url = request.nextUrl.clone()
      url.pathname = '/' // Redirect to login
      return NextResponse.redirect(url)
    }
  }

  const response = NextResponse.next()

  // Prevent browsers from caching protected dashboards so the Back button won't reveal them after logout
  if (isAdminRoute) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}