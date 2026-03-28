import { NextRequest, NextResponse } from 'next/server';
import { updateTracking, getSubmission } from '@/lib/submissionStore';
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

    const updates = await request.json();

    // Only allow tracking field updates
    const allowedUpdates: any = {};

    // Payment tracking
    if (updates.paymentStatus !== undefined) allowedUpdates.paymentStatus = updates.paymentStatus;
    if (updates.paymentReceivedDate !== undefined) allowedUpdates.paymentReceivedDate = updates.paymentReceivedDate;
    if (updates.paymentAmount !== undefined) allowedUpdates.paymentAmount = updates.paymentAmount;
    if (updates.paymentNotes !== undefined) allowedUpdates.paymentNotes = updates.paymentNotes;

    // Debtor response tracking
    if (updates.debtorResponded !== undefined) allowedUpdates.debtorResponded = updates.debtorResponded;
    if (updates.debtorResponseDate !== undefined) allowedUpdates.debtorResponseDate = updates.debtorResponseDate;
    if (updates.debtorResponseNotes !== undefined) allowedUpdates.debtorResponseNotes = updates.debtorResponseNotes;

    // Case closure
    if (updates.caseClosed !== undefined) allowedUpdates.caseClosed = updates.caseClosed;
    if (updates.caseClosedDate !== undefined) allowedUpdates.caseClosedDate = updates.caseClosedDate;
    if (updates.caseClosureReason !== undefined) allowedUpdates.caseClosureReason = updates.caseClosureReason;
    if (updates.caseNotes !== undefined) allowedUpdates.caseNotes = updates.caseNotes;

    // Update the submission
    const updated = updateTracking(params.id, allowedUpdates);

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update tracking' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, submission: updated });
  } catch (error) {
    console.error('Tracking update error:', error);
    return NextResponse.json(
      { error: 'Failed to update tracking' },
      { status: 500 }
    );
  }
}
