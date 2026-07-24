import { NextResponse } from 'next/server'

export function middleware(request) {
  const path = request.nextUrl.pathname

  // Define protected admin routes
  const protectedAdminPaths = ['/manage-teachers', '/manage-students', '/admin', '/dashboard', '/admin-dashboard'];
  const isAdminRoute = protectedAdminPaths.some((route) => path.startsWith(route));

  if (isAdminRoute) {
    // Check if your custom admin storage/cookie exists
    // Note: Middleware runs on the server, so it checks request cookies. 
    // Make sure your login sets a cookie instead of just localStorage, OR adjust your check:
    const adminEmailCookie = request.cookies.get('active_admin_email')?.value;

    if (!adminEmailCookie) {
      const url = request.nextUrl.clone()
      url.pathname = '/' // Points back to your login page route
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}