import { NextRequest, NextResponse } from 'next/server'
import { getUser } from './lib/get-user'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const user = await getUser(request)

  const isAuthenticated = !!user
  const hasUsername = !!user?.username

  // Public routes (accessible when not authenticated)
  const publicRoutes = ['/', '/auth/sign-in', '/auth/sign-up']
  const isPublicRoute = publicRoutes.includes(pathname)

  // Username setup route
  const isUsernameRoute = pathname === '/auth/username'

  // Chat routes
  const isChatRoute = pathname === '/chats' || pathname.startsWith('/chats/')

  // Not authenticated - only allow public routes
  if (!isAuthenticated) {
    if (!isPublicRoute) {
      return NextResponse.redirect(new URL('/auth/sign-in', request.url))
    }
    return NextResponse.next()
  }

  // Authenticated but no username - only allow username setup
  if (isAuthenticated && !hasUsername) {
    if (!isUsernameRoute) {
      return NextResponse.redirect(new URL('/auth/username', request.url))
    }
    return NextResponse.next()
  }

  // Authenticated with username - only allow chat routes
  if (isAuthenticated && hasUsername) {
    if (!isChatRoute) {
      return NextResponse.redirect(new URL('/chats', request.url))
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
}
