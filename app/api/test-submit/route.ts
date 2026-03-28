import { NextRequest, NextResponse } from 'next/server';
import { LetterData } from '@/types';
import { validateClaimDescription } from '@/lib/contentValidation';
import { addSubmission } from '@/lib/submissionStore';
import { sendAdminNotification } from '@/lib/emailService';

/**
 * TEST ENDPOINT - Bypasses Stripe payment
 * In production, submissions come through the Stripe webhook after payment
 * This endpoint is for testing the workflow without Stripe
 */
export async function POST(request: NextRequest) {
  try {
    const letterData: LetterData = await request.json();

    // Validate required fields
    if (!letterData.client?.clientName || !letterData.debtorName || !letterData.amountOwed) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate the claim description
    const validation = validateClaimDescription(letterData.claimDescription);

    // Create submission for admin review
    const submission = addSubmission({
      letterData,
      stripeSessionId: `test_${Date.now()}`, // Test session ID
      flaggedReasons: validation.requiresAdminReview
        ? validation.warnings
        : ['Test submission (no payment processed)'],
    });

    console.log('Test submission created:', submission.id);

    // Send admin notification email
    try {
      await sendAdminNotification({
        submissionId: submission.id,
        clientName: letterData.client.clientName,
        clientEmail: letterData.client.clientEmail,
        debtorName: letterData.debtorName,
        amountOwed: letterData.amountOwed,
        claimDescription: letterData.claimDescription,
        flaggedReasons: submission.flaggedReasons,
      });
      console.log('Admin notification sent for submission:', submission.id);
    } catch (emailError) {
      // Don't fail the submission if email fails
      console.error('Failed to send admin notification:', emailError);
    }

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      message: 'Submission created for admin review'
    });
  } catch (error) {
    console.error('Test submission error:', error);
    return NextResponse.json(
      { error: 'Failed to create submission' },
      { status: 500 }
    );
  }
}
