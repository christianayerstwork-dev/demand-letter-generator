# Smart Settle Go - Demand Letter Generator

A professional web application for generating and sending formal demand letters for debt recovery.

## Current Status

✅ **Phase 1 - Letter Generation (COMPLETE)**
✅ **Phase 2 - Payment Integration (COMPLETE)**
✅ **Phase 3 - Email Sending (COMPLETE)**
✅ **Phase 4 - Admin Dashboard (COMPLETE)**

🎉 **ALL CORE FEATURES COMPLETE!**

## Features

### ✅ Letter Generation
- User-friendly form with client and debtor details
- Real-time preview with watermark protection
- 4 tone variations (Friendly, Professional, Assertive, Aggressive)
- Support for multiple relationships (landlord, company, individual, custom)
- Content validation to prevent abuse
- Responsive design (mobile & desktop)

### ✅ PDF Generation
- Professional A4 format with Smart Settle Go branding
- Clean, legal-style layout
- Download functionality for testing

### ✅ Payment Processing
- Stripe integration for secure payments
- £5.00 per letter (configurable)
- Test mode for development
- Success/cancel pages

### ✅ Email Delivery
- Automated email sending after payment
- PDF attachment of demand letter
- Emails sent to debtor (with CC to client)
- Confirmation email to client
- Professional HTML templates

### ✅ Admin Dashboard
- **Secure authentication** with session-based login
- Review flagged submissions
- Approve/reject letters before sending
- View full letter previews
- Track submission status (pending/approved/rejected)
- File-based data storage (upgrade to database for production)

## Quick Start

### Prerequisites

- Node.js v18+ (already installed via NVM)
- Stripe account (for payments)
- Resend account (for emails)

### Running the App

1. Navigate to project:
   ```bash
   cd ~/demand-letter-generator
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:3000

## Setup Guides

📖 **Payment Setup**: See `STRIPE_SETUP.md` for Stripe configuration
📖 **Email Setup**: See `EMAIL_SETUP.md` for Resend configuration
📖 **Admin Authentication**: Admin dashboard is protected - see Environment Setup below

## How It Works

1. **Client fills out form** with debtor and claim details
2. **System validates** content for inappropriate language
3. **Client reviews preview** (watermarked)
4. **Client submits** → redirected to Stripe payment (£5.00)
5. **After payment** → System checks content:
   - ✅ **Clean content** → Emails sent immediately
   - ⚠️ **Flagged content** → Saved for admin review
6. **Admin reviews** flagged submissions (if any)
7. **Emails sent** (after approval or automatically)
   - Demand letter PDF → debtor (CC: client)
   - Confirmation email → client

## Environment Setup

Create a `.env.local` file with these variables:

```bash
# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_AMOUNT=500

# Resend
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@smart-settle-go.com

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Admin Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_this_to_secure_password
```

**⚠️ IMPORTANT**: Change `ADMIN_USERNAME` and `ADMIN_PASSWORD` to secure values before deploying to production!

See setup guides for details on getting API keys.

## Testing

### Test the Complete Flow

1. Fill out form with your email for both client and debtor
2. Submit → redirected to Stripe
3. Pay with test card: **4242 4242 4242 4242**
4. Check your email for:
   - Demand letter PDF (as "debtor")
   - Confirmation email (as client)

### Other Test Cards

| Card | Result |
|------|--------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Declined |
| 4000 0025 0000 3155 | Requires 3D Secure |

## Project Structure

```
demand-letter-generator/
├── app/
│   ├── api/
│   │   ├── create-checkout-session/  # Stripe checkout
│   │   ├── generate-pdf/              # PDF generation
│   │   └── webhooks/stripe/           # Webhook handler
│   ├── payment-success/               # Success page
│   ├── payment-cancelled/             # Cancel page
│   └── page.tsx                       # Main form
├── components/
│   └── LetterPreview.tsx              # Preview component
├── lib/
│   ├── contentValidation.ts           # Input validation
│   ├── emailService.ts                # Email utilities
│   ├── letterTemplate.ts              # Letter generation
│   └── pdfGenerator.tsx               # PDF generation
├── types/
│   └── index.ts                       # TypeScript types
├── .env.local                         # Config (not in git)
├── EMAIL_SETUP.md                     # Email guide
├── STRIPE_SETUP.md                    # Payment guide
└── README.md                          # This file
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **PDF**: @react-pdf/renderer
- **Payment**: Stripe
- **Email**: Resend
- **Date**: date-fns

## Content Validation

The system prevents abuse by checking for:

- ❌ Profanity and threats
- ❌ Personal attacks
- ❌ Informal language (ain't, gonna, etc.)
- ⚠️ Flags suspicious content for admin review
- ✅ Suggests professional alternatives

## Pricing

Current: **£5.00 per letter**

To change, update `STRIPE_PRICE_AMOUNT` in `.env.local`:
- £3 = 300
- £5 = 500
- £10 = 1000

## Deployment

### Recommended: Vercel

1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy!

Use **live Stripe keys** and **verified Resend domain** for production.

## Admin Access

To access the admin dashboard:

1. Navigate to `http://localhost:3000/admin`
2. Log in with credentials from `.env.local`:
   - Username: `admin` (or your custom value)
   - Password: `change_this_password` (or your custom value)
3. Review and approve/reject submissions

**Security Features:**
- Session-based authentication with httpOnly cookies
- Protected API routes with middleware
- 24-hour session expiration
- Automatic redirect on unauthorized access

## Production Enhancements

Before going live, consider:

- [x] **Add admin authentication** ✅ COMPLETE
- [ ] **Migrate to database** (currently uses JSON file)
- [ ] **Add email tracking** (delivery/open rates)
- [ ] **Implement refunds** (for rejected submissions)
- [ ] **Create client portal** (track letter status)
- [ ] **Add analytics** (usage metrics)
- [ ] **Multi-language support** (for international use)
- [ ] **Auto-refund rejected submissions**
- [ ] **Email templates for rejections**

## Troubleshooting

**Emails not sending?**
- Check Resend API key in `.env.local`
- Restart server after env changes
- Check Resend dashboard logs

**Payment not working?**
- Check Stripe keys are correct
- Ensure test mode keys start with `pk_test_` and `sk_test_`
- Check Stripe dashboard logs

**Webhook issues?**
- For local testing, use Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- Check webhook secret is correct
- Review server logs

## Support

For detailed help:
- `STRIPE_SETUP.md` - Payment configuration
- `EMAIL_SETUP.md` - Email configuration
- Server logs - Terminal output
- Stripe logs - Dashboard → Developers → Logs
- Resend logs - Dashboard → Logs

---

**Smart Settle Go**
Professional Debt Recovery Services
Version 3.1 - Secure Admin Authentication Added

✅ **Ready for Testing**: All core features complete with secure admin access
