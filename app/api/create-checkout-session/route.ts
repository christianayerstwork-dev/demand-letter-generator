import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { LetterData } from '@/types';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const data: LetterData = await request.json();

    // Validate required fields
    if (!data.client?.clientName || !data.debtorName || !data.amountOwed) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the base URL from environment or request
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'Demand Letter Generation',
              description: `Letter for ${data.debtorName} - ${data.claimDescription}`,
            },
            unit_amount: parseInt(process.env.STRIPE_PRICE_AMOUNT || '500'), // £5.00 default
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payment-cancelled`,
      customer_email: data.client.clientEmail,
      metadata: {
        // Store letter data in metadata to retrieve after payment
        clientName: data.client.clientName,
        clientEmail: data.client.clientEmail,
        clientPhone: data.client.clientPhone || '',
        relationshipToDebtor: data.client.relationshipToDebtor,
        relationshipOther: data.client.relationshipOther || '',
        debtorName: data.debtorName,
        debtorAddress: data.debtorAddress,
        debtorEmail: data.debtorEmail,
        amountOwed: data.amountOwed,
        paymentDate: data.paymentDate,
        claimDescription: data.claimDescription,
        tone: data.tone,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
