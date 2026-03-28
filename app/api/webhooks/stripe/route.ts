import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { LetterData } from '@/types';
import { sendDemandLetter, sendClientConfirmation } from '@/lib/emailService';
import { validateClaimDescription } from '@/lib/contentValidation';
import { addSubmission } from '@/lib/submissionStore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
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
          },
          debtorName: session.metadata!.debtorName,
          debtorAddress: session.metadata!.debtorAddress,
          debtorEmail: session.metadata!.debtorEmail,
          amountOwed: session.metadata!.amountOwed,
          paymentDate: session.metadata!.paymentDate,
          claimDescription: session.metadata!.claimDescription,
          tone: session.metadata!.tone as any,
        };

        // Validate the claim description
        const validation = validateClaimDescription(letterData.claimDescription);

        // If requires admin review, store for approval
        if (validation.requiresAdminReview) {
          console.log('Submission requires admin review:', session.id);

          addSubmission({
            letterData,
            stripeSessionId: session.id,
            flaggedReasons: validation.warnings,
          });

          console.log('Submission stored for admin review');
          // Note: Email will be sent after admin approval
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
