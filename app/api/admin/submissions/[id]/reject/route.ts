import { NextRequest, NextResponse } from 'next/server';
import { rejectSubmission, getSubmission } from '@/lib/submissionStore';
import { sendRejectionEmail } from '@/lib/emailService';
import { requireAdminAuth } from '@/lib/authMiddleware';

export async function POST(
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

    if (submission.status !== 'pending') {
      return NextResponse.json(
        { error: 'Submission already reviewed' },
        { status: 400 }
      );
    }

    // Get rejection message from request body
    const { message } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Rejection message is required' },
        { status: 400 }
      );
    }

    // Mark as rejected
    rejectSubmission(params.id);

    // Send rejection email to client
    try {
      await sendRejectionEmail({
        to: submission.letterData.client.clientEmail,
        clientName: submission.letterData.client.clientName,
        rejectionReason: message,
      });

      console.log('Rejection email sent to:', submission.letterData.client.clientEmail);
    } catch (emailError) {
      console.error('Error sending rejection email:', emailError);
      // Still return success - submission is rejected even if email fails
      return NextResponse.json({
        success: true,
        warning: 'Rejected but email sending failed. Check logs.',
      });
    }

    console.log('Submission rejected:', params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Rejection error:', error);
    return NextResponse.json(
      { error: 'Failed to reject submission' },
      { status: 500 }
    );
  }
}
