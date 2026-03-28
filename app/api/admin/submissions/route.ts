import { NextRequest, NextResponse } from 'next/server';
import { getPendingSubmissions, getAllSubmissions } from '@/lib/submissionStore';
import { requireAdminAuth } from '@/lib/authMiddleware';

export async function GET(request: NextRequest) {
  // Check authentication
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const submissions = getAllSubmissions();

    // Sort by most recent first
    submissions.sort((a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

    return NextResponse.json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}
