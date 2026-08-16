import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth?.token
    const path = req.nextUrl.pathname
    // Admin area requires admin role.
    if (path.startsWith('/admin') && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url))
    }
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: [
    /*
     * Protect pages only. API routes guard themselves with getServerSession.
     * Exclude: /login, all /api, Next.js internals, and static assets.
     */
    '/((?!login|api|_next/static|_next/image|favicon.svg|og-image.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
