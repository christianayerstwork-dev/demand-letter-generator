import { NextRequest, NextResponse } from 'next/server';
import { getAllSubmissions, updateTracking } from '@/lib/submissionStore';

/**
 * Resend webhook handler for email tracking events
 *
 * To set up:
 * 1. Go to Resend Dashboard → Webhooks
 * 2. Add webhook URL: https://yourdomain.com/api/webhooks/resend
 * 3. Subscribe to events: email.delivered, email.opened, email.clicked
 * 4. Copy the signing secret and add to .env as RESEND_WEBHOOK_SECRET
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // TODO: Verify webhook signature in production
    // const signature = request.headers.get('resend-signature');
    // if (!verifySignature(body, signature, process.env.RESEND_WEBHOOK_SECRET)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    const { type, data } = body;

    // Extract submission_id from email tags
    const submissionId = data.tags?.find((tag: any) => tag.name === 'submission_id')?.value;

    if (!submissionId) {
      console.log('No submission_id found in webhook:', body);
      return NextResponse.json({ received: true });
    }

    console.log(`Resend webhook: ${type} for submission ${submissionId}`);

    // Handle different event types
    switch (type) {
      case 'email.delivered':
        await updateTracking(submissionId, {
          emailDelivered: true,
          emailDeliveredAt: new Date().toISOString(),
        });
        console.log(`✓ Email delivered: ${submissionId}`);
        break;

      case 'email.opened':
        const currentOpenCount = await getCurrentOpenCount(submissionId);
        await updateTracking(submissionId, {
          emailOpened: true,
          emailOpenedAt: !currentOpenCount ? new Date().toISOString() : undefined, // Only set timestamp on first open
          emailOpenCount: (currentOpenCount || 0) + 1,
        });
        console.log(`✓ Email opened (${(currentOpenCount || 0) + 1}x): ${submissionId}`);
        break;

      case 'email.clicked':
        await updateTracking(submissionId, {
          emailClicked: true,
          emailClickedAt: new Date().toISOString(),
        });
        console.log(`✓ Email link clicked: ${submissionId}`);
        break;

      case 'email.bounced':
      case 'email.complained':
        console.log(`⚠️ Email issue (${type}): ${submissionId}`);
        // Could add handling for bounces/complaints here
        break;

      default:
        console.log(`Unhandled webhook type: ${type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Resend webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function getCurrentOpenCount(submissionId: string): Promise<number> {
  const submissions = getAllSubmissions();
  const submission = submissions.find(s => s.id === submissionId);
  return submission?.emailOpenCount || 0;
}
