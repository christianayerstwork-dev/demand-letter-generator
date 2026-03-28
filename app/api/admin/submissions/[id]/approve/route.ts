import { NextRequest, NextResponse } from 'next/server';
import { approveSubmission, getSubmission, updateTracking } from '@/lib/submissionStore';
import { sendDemandLetter, sendClientConfirmation, sendSelfDeliveryLetter } from '@/lib/emailService';
import { requireAdminAuth } from '@/lib/authMiddleware';
import { generatePaymentToken, generatePaymentLink } from '@/lib/paymentLinkUtils';

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

    // Mark as approved
    approveSubmission(params.id);

    // Generate unique payment link token
    const paymentToken = generatePaymentToken();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const paymentLink = generatePaymentLink(params.id, paymentToken, baseUrl);

    updateTracking(params.id, {
      paymentLinkToken: paymentToken,
    });

    // Send the emails based on delivery method
    try {
      if (submission.letterData.deliveryMethod === 'self') {
        // Self-delivery: Send PDF to client for them to deliver
        await sendSelfDeliveryLetter(submission.letterData);
        console.log('Self-delivery letter sent to client:', params.id);
      } else {
        // Email delivery: Smart Settle Go sends to debtor
        if (submission.letterData.debtorEmail && submission.letterData.debtorEmail.trim()) {
          // Send to debtor with client CC'd
          await sendDemandLetter({
            to: submission.letterData.debtorEmail,
            cc: submission.letterData.client.clientEmail,
            subject: `Demand for Payment - ${submission.letterData.claimDescription}`,
            letterData: submission.letterData,
            paymentLink: paymentLink,
            submissionId: params.id,
          });

          // Send confirmation to client
          await sendClientConfirmation(submission.letterData);
          console.log('Email delivery: Letters sent to debtor and client confirmation:', params.id);
        } else {
          // No debtor email provided for email delivery - should not happen due to form validation
          throw new Error('Debtor email is required for email delivery method');
        }
      }

      console.log('Approved submission emails sent:', params.id);
    } catch (emailError) {
      console.error('Error sending emails after approval:', emailError);
      // Still return success - submission is approved even if email fails
      return NextResponse.json({
        success: true,
        warning: 'Approved but email sending failed. Check logs.',
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Approval error:', error);
    return NextResponse.json(
      { error: 'Failed to approve submission' },
      { status: 500 }
    );
  }
}
