import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { LetterData } from '@/types';
import { sendDemandLetter, sendClientConfirmation, sendSubmissionConfirmation, sendAdminNotification } from '@/lib/emailService';
import { validateClaimDescription } from '@/lib/contentValidation';
import { addSubmission } from '@/lib/submissionStore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

// This is needed to handle raw body for webhook signature verification
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;

      console.log('Payment successful for session:', session.id);

      try {
        // Reconstruct the letter data from metadata
        const letterData: LetterData = {
          client: {
            clientName: session.metadata!.clientName,
            clientEmail: session.metadata!.clientEmail,
            clientPhone: session.metadata!.clientPhone || undefined,
            relationshipToDebtor: session.metadata!.relationshipToDebtor as any,
            relationshipOther: session.metadata!.relationshipOther || undefined,
            bankName: session.metadata!.bankName || '',
            sortCode: session.metadata!.sortCode || '',
            accountNumber: session.metadata!.accountNumber || '',
          },
          debtorName: session.metadata!.debtorName,
          debtorAddress: session.metadata!.debtorAddress,
          debtorEmail: session.metadata!.debtorEmail,
          amountOwed: session.metadata!.amountOwed,
          paymentDate: session.metadata!.paymentDate,
          claimDescription: session.metadata!.claimDescription,
          tone: session.metadata!.tone as any,
          deliveryMethod: (session.metadata!.deliveryMethod as any) || 'email',
          attachments: [],
        };

        // Validate the claim description
        const validation = validateClaimDescription(letterData.claimDescription);

        // If requires admin review, store for approval
        if (validation.requiresAdminReview) {
          console.log('Submission requires admin review:', session.id);

          const submission = addSubmission({
            letterData,
            stripeSessionId: session.id,
            flaggedReasons: validation.warnings,
          });

          console.log('Submission stored for admin review');

          // Send admin notification
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
            console.error('Failed to send admin notification:', emailError);
          }

          // Send client confirmation that submission is under review
          try {
            await sendSubmissionConfirmation({
              submissionId: submission.id,
              clientName: letterData.client.clientName,
              clientEmail: letterData.client.clientEmail,
              debtorName: letterData.debtorName,
              amountOwed: letterData.amountOwed,
              claimDescription: letterData.claimDescription,
            });
            console.log('Client confirmation sent for submission:', submission.id);
          } catch (emailError) {
            console.error('Failed to send client confirmation:', emailError);
          }
        } else {
          // Send immediately if no review needed
          await sendDemandLetter({
            to: letterData.debtorEmail,
            cc: letterData.client.clientEmail,
            subject: `Demand for Payment - ${letterData.claimDescription}`,
            letterData: letterData,
          });

          await sendClientConfirmation(letterData);

          console.log('Emails sent successfully for session:', session.id);
        }
      } catch (error) {
        console.error('Error processing submission:', error);
        // Don't return error to Stripe - we've received the payment
        // Log this for manual follow-up
        console.error('MANUAL ACTION REQUIRED: Processing failed for session:', session.id);
      }
      break;

    case 'payment_intent.payment_failed':
      console.log('Payment failed:', event.data.object);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  // Return 200 to acknowledge receipt of the event
  return NextResponse.json({ received: true });
}
