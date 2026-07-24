import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // 1. Initialize Supabase client configured to handle server-side cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 2. Fetch the current logged-in user session securely on the server
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // 3. Define your protected administrative routes
  // Any route starting with these paths will be checked for authentication
  const protectedAdminPaths = ['/manage-teachers', '/manage-students', '/admin', '/dashboard'];
  const isAdminRoute = protectedAdminPaths.some((route) => path.startsWith(route));

  // 4. If someone tries to access an admin route without being logged in, redirect them to login
  if (isAdminRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login' // Change this to your exact login page route if it differs
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

// 5. Configure which files/folders the middleware should run on (and which to skip)
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static assets)
     * - _next/image (image optimization files)
     * - favicon.ico (browser icon)
     * - login page itself (to prevent endless redirect loops)
     * - public image files (.svg, .png, .jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|login|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}