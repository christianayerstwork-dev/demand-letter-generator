import { NextRequest, NextResponse } from 'next/server';
import { updateSubmission, getSubmission } from '@/lib/submissionStore';
import { requireAdminAuth } from '@/lib/authMiddleware';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check authentication
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const submission = getSubmission(params.id);

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    const { letterData } = await request.json();

    if (!letterData) {
      return NextResponse.json(
        { error: 'Letter data is required' },
        { status: 400 }
      );
    }

    // Update the submission
    const updated = updateSubmission(params.id, letterData);

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update submission' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, submission: updated });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update submission' },
      { status: 500 }
    );
  }
}
