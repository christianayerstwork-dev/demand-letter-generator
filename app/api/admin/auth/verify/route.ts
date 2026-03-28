import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Import sessions from login route
// We'll create a shared utility instead
import { verifyAdminSession } from '@/lib/authUtils';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('admin_session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const isValid = verifyAdminSession(sessionToken);

    if (isValid) {
      return NextResponse.json({ authenticated: true });
    }

    return NextResponse.json({ authenticated: false }, { status: 401 });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
