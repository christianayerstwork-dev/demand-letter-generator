import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession } from './authUtils';

/**
 * Middleware to protect admin routes
 * Returns null if authenticated, or an error response if not
 */
export async function requireAdminAuth(request: NextRequest): Promise<NextResponse | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('admin_session')?.value;

    console.log('Auth check - Session token present:', !!sessionToken);
    console.log('Auth check - Path:', request.nextUrl.pathname);

    if (!sessionToken) {
      console.log('Auth failed: No session token');
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const isValid = verifyAdminSession(sessionToken);
    console.log('Auth check - Session valid:', isValid);

    if (!isValid) {
      console.log('Auth failed: Invalid or expired session');
      return NextResponse.json(
        { error: 'Unauthorized - Session expired' },
        { status: 401 }
      );
    }

    // Authentication successful
    console.log('Auth successful for path:', request.nextUrl.pathname);
    return null;
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
