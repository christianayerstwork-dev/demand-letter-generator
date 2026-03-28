import { NextRequest, NextResponse } from 'next/server';
import { getSubmission, updateTracking } from '@/lib/submissionStore';

export async function GET(
  request: NextRequest,
  { params }: { params: { submissionId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Missing payment link token' },
        { status: 400 }
      );
    }

    const submission = getSubmission(params.submissionId);

    if (!submission) {
      return NextResponse.json(
        { error: 'Payment link not found' },
        { status: 404 }
      );
    }

    // Verify token matches
    if (submission.paymentLinkToken !== token) {
      return NextResponse.json(
        { error: 'Invalid payment link token' },
        { status: 403 }
      );
    }

    // Track the click
    const currentClickCount = submission.paymentLinkClickCount || 0;
    const isFirstClick = !submission.paymentLinkClicked;

    updateTracking(params.submissionId, {
      paymentLinkClicked: true,
      paymentLinkClickedAt: isFirstClick ? new Date().toISOString() : submission.paymentLinkClickedAt,
      paymentLinkClickCount: currentClickCount + 1,
    });

    // Return payment details
    return NextResponse.json({
      amountOwed: submission.letterData.amountOwed,
      creditorName: submission.letterData.client.clientName,
      description: submission.letterData.claimDescription,
      paymentDate: submission.letterData.paymentDate,
      reference: `DL-${params.submissionId.slice(-8).toUpperCase()}`,
      bankDetails: submission.letterData.client.bankName ? {
        bankName: submission.letterData.client.bankName,
        sortCode: submission.letterData.client.sortCode,
        accountNumber: submission.letterData.client.accountNumber,
        accountName: submission.letterData.client.clientName,
      } : null,
    });
  } catch (error) {
    console.error('Payment page error:', error);
    return NextResponse.json(
      { error: 'Failed to load payment details' },
      { status: 500 }
    );
  }
}
