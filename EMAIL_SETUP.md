# Email Sending Setup Guide

The email sending functionality has been successfully built! Here's how to complete the setup and test it.

## What's Been Done

✅ Installed Resend email service
✅ Created email sending utility with PDF attachment
✅ Built professional HTML email templates
✅ Created Stripe webhook to trigger emails after payment
✅ Added client confirmation emails
✅ Updated environment variables

## How It Works

1. **User completes payment** via Stripe checkout
2. **Stripe sends a webhook** to your server
3. **Webhook triggers emails:**
   - Sends demand letter PDF to debtor
   - CCs the client on the demand letter
   - Sends separate confirmation email to client
4. **Clients receive confirmation** that letter was sent

## Email Features

### Demand Letter Email (to Debtor):
- Professional HTML email with Smart Settle Go branding
- PDF attachment with full demand letter
- Summary of amount owed and payment deadline
- Automatically CC's the client

### Confirmation Email (to Client):
- Success confirmation with green branding
- Summary of what was sent
- Next steps guidance
- Important disclaimers

## Setup Instructions

### Step 1: Create a Resend Account

1. Go to https://resend.com/signup
2. Sign up for a free account (100 emails/day free tier)
3. Verify your email address

### Step 2: Get Your API Key

1. In Resend dashboard, go to **API Keys**
2. Click "Create API Key"
3. Give it a name like "Smart Settle Go Production"
4. Copy the API key (starts with `re_`)

### Step 3: Set Up Your Domain (Important!)

For production emails, you need to verify your domain:

1. In Resend dashboard, go to **Domains**
2. Click "Add Domain"
3. Enter your domain: `smart-settle-go.com`
4. Add the DNS records Resend provides to your domain settings
5. Wait for verification (usually 5-10 minutes)

**For Testing**: You can use `onboarding@resend.dev` as the FROM email without domain verification, but emails will only go to your own verified email.

### Step 4: Update Environment Variables

Open `.env.local` and update:

```bash
# Add your actual Resend API key
RESEND_API_KEY=re_your_actual_api_key_here

# Update this once your domain is verified
FROM_EMAIL=noreply@smart-settle-go.com
```

**For testing before domain verification:**
```bash
FROM_EMAIL=onboarding@resend.dev
```

### Step 5: Set Up Stripe Webhook (Critical!)

Emails are triggered by Stripe webhooks, so you need to set this up:

#### For Local Testing (Using Stripe CLI):

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login to Stripe CLI:
   ```bash
   stripe login
   ```
3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
4. Copy the webhook signing secret (starts with `whsec_`)
5. Add it to `.env.local`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   ```

#### For Production (Using Stripe Dashboard):

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Click "Add endpoint"
3. Enter your production URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `checkout.session.completed` (required)
   - `payment_intent.payment_failed` (optional)
5. Click "Add endpoint"
6. Copy the signing secret
7. Add to production environment variables

### Step 6: Test the Complete Flow

1. Start your dev server: `npm run dev`
2. In a separate terminal, start Stripe webhook forwarding:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
3. Fill out the letter form at http://localhost:3000
4. **Important**: Use your real email as both the client email and debtor email for testing
5. Click "Submit for Review & Payment"
6. Use test card: 4242 4242 4242 4242
7. Complete the payment
8. Check your email! You should receive:
   - Demand letter (as the "debtor")
   - Confirmation email (as the client)

## Email Templates

The system sends two types of emails:

### 1. Demand Letter Email
- **To**: Debtor's email
- **CC**: Client's email
- **Subject**: "Demand for Payment - [Claim Description]"
- **Attachment**: PDF demand letter
- **Content**: Professional notice with payment details

### 2. Client Confirmation
- **To**: Client's email
- **Subject**: "Your demand letter has been sent to [Debtor Name]"
- **Content**: Success confirmation with next steps

## Troubleshooting

### Problem: Emails not sending

**Check**:
1. Resend API key is correct in `.env.local`
2. Server was restarted after updating `.env.local`
3. Stripe webhook is properly configured
4. Check Resend dashboard → Logs for errors

### Problem: Webhook not receiving events

**Check**:
1. Stripe CLI is running (`stripe listen...`)
2. Webhook secret is correct in `.env.local`
3. Check terminal running `stripe listen` for events
4. Check your server logs for errors

### Problem: "Domain not verified" error

**Solutions**:
- For testing: Use `FROM_EMAIL=onboarding@resend.dev`
- For production: Complete domain verification in Resend dashboard

### Problem: Emails go to spam

**Solutions**:
- Verify your domain in Resend (adds SPF/DKIM records)
- Add DMARC record to your DNS
- Use a professional FROM name and email
- Don't use words like "urgent" or excessive punctuation

## Important Notes

⚠️ **Free Tier Limits**:
- Resend free tier: 100 emails/day, 3,000/month
- Stripe test mode: Unlimited transactions
- Monitor usage in Resend dashboard

⚠️ **Email Best Practices**:
- Always test with real email addresses first
- Check spam folders initially
- Verify domain for better deliverability
- Monitor bounce rates in Resend dashboard

⚠️ **Data Privacy**:
- Letter data passes through Stripe metadata
- Emails contain personal information
- Ensure GDPR/data protection compliance
- Consider adding privacy policy

## Testing Checklist

- [ ] Resend account created
- [ ] API key added to `.env.local`
- [ ] Stripe webhook secret configured
- [ ] Test email sent successfully
- [ ] PDF attachment received correctly
- [ ] Client confirmation email received
- [ ] Emails don't go to spam
- [ ] Mobile email display looks good

## Production Checklist

- [ ] Domain verified in Resend
- [ ] Production webhook configured in Stripe
- [ ] FROM_EMAIL updated to your domain
- [ ] Webhook endpoint publicly accessible
- [ ] SSL certificate active (https)
- [ ] Error logging configured
- [ ] Email delivery monitoring set up

## Next Steps

Once emails are working:
1. Test with different email providers (Gmail, Outlook, etc.)
2. Check mobile email display
3. Monitor delivery rates
4. Consider adding email preferences/unsubscribe
5. Set up admin dashboard for oversight

## Questions?

Common issues:
- **Resend Logs**: Shows all email attempts and errors
- **Stripe Webhook Logs**: Shows all webhook events
- **Server Logs**: Check terminal for errors
- **Browser Console**: Check for frontend errors
