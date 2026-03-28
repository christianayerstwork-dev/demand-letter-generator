# Stripe Payment Integration Setup Guide

The Stripe payment integration has been successfully installed! Here's how to complete the setup when you're ready.

## What's Been Done

✅ Installed Stripe packages (`stripe` and `@stripe/stripe-js`)
✅ Created environment variables file (`.env.local`)
✅ Built Stripe checkout session API endpoint
✅ Created payment success page
✅ Created payment cancelled page
✅ Updated submit button to redirect to Stripe checkout

## How It Works

1. **User fills out the form** and clicks "Submit for Review & Payment"
2. **System creates a Stripe checkout session** with the letter details
3. **User is redirected to Stripe's secure payment page**
4. **After payment:**
   - Success → Redirected to `/payment-success` page
   - Cancelled → Redirected to `/payment-cancelled` page
5. **Letter details are stored in Stripe metadata** for later retrieval

## Setup Instructions (For Tomorrow)

### Step 1: Get Your Stripe API Keys

1. Go to https://dashboard.stripe.com/register (or login if you have an account)
2. Complete the registration
3. Go to **Developers** → **API Keys**
4. You'll see two types of keys:
   - **Test keys** (start with `pk_test_` and `sk_test_`) - Use these for testing
   - **Live keys** (start with `pk_live_` and `sk_live_`) - Use these in production

### Step 2: Update Your Environment Variables

Open the file `/Users/christianayerst/demand-letter-generator/.env.local` and replace the placeholder values:

```bash
# Replace these with your actual Stripe test keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_key_here
STRIPE_SECRET_KEY=sk_test_your_actual_key_here

# Set your price (in pence - 500 = £5.00, 1000 = £10.00)
STRIPE_PRICE_AMOUNT=500

# Keep this as-is for local testing
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Step 3: Restart Your Development Server

After updating the `.env.local` file:

1. Stop the current server (Ctrl+C in the terminal)
2. Restart with: `npm run dev`

### Step 4: Test the Payment Flow

1. Fill out the letter form at http://localhost:3000
2. Click "Submit for Review & Payment"
3. You'll be redirected to Stripe's checkout page
4. Use Stripe's test card number: **4242 4242 4242 4242**
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any valid ZIP code
5. Complete the test payment
6. You should be redirected to the success page!

## Test Card Numbers

Stripe provides these test cards:

| Card Number         | Description                    |
|---------------------|--------------------------------|
| 4242 4242 4242 4242 | Successful payment            |
| 4000 0000 0000 0002 | Card declined                 |
| 4000 0000 0000 9995 | Insufficient funds            |
| 4000 0025 0000 3155 | Requires authentication (3D Secure) |

## Current Pricing

The default price is set to **£5.00** per letter (500 pence).

To change this, update `STRIPE_PRICE_AMOUNT` in `.env.local`:
- £3.00 = 300
- £5.00 = 500
- £10.00 = 1000
- £15.00 = 1500

## Next Steps (After Payment Works)

Once payment is working, we'll need to:

1. **Add a webhook** to handle successful payments (generate PDF, send email)
2. **Add email functionality** to send letters to debtors
3. **Build admin dashboard** for reviewing flagged content
4. **Go live** with real Stripe keys when ready

## Important Security Notes

⚠️ **Never commit your `.env.local` file to Git!** It contains secret keys.
⚠️ The `.env.local` file is already in `.gitignore` - keep it there!
⚠️ When deploying to production, set environment variables in your hosting platform (Vercel, etc.)

## Troubleshooting

**Problem**: Payment button doesn't do anything
- Check browser console for errors
- Ensure `.env.local` has been updated with real keys
- Ensure server was restarted after updating `.env.local`

**Problem**: "No checkout URL received"
- Check that your Stripe secret key is correct
- Check the server terminal for API errors

**Problem**: Can't test payments
- Ensure you're using **test mode** keys (start with `pk_test_` and `sk_test_`)
- Use the test card number 4242 4242 4242 4242

## Questions?

If you run into issues, check:
1. Stripe Dashboard → Developers → Logs (shows all API calls)
2. Browser console (F12) for frontend errors
3. Terminal/server logs for backend errors
