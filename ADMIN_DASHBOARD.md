# Admin Dashboard Guide

The admin dashboard allows you to review and approve/reject submissions that have been flagged for potentially inappropriate content.

## How It Works

### Automatic Filtering

When a user submits a letter, the system automatically checks the claim description for:

- **Inappropriate keywords**: profanity, threats, harassment
- **Personal attacks**: "you're a...", accusations
- **Informal language**: slang, casual phrases

### Review Workflow

1. **User pays** via Stripe (£5.00)
2. **System validates** claim description
3. **Two paths**:
   - ✅ **Clean content** → Email sent immediately
   - ⚠️ **Flagged content** → Saved for admin review

### Admin Review

Flagged submissions are stored in `/data/submissions.json` and displayed in the admin dashboard at `/admin`.

## Accessing the Dashboard

1. Go to http://localhost:3000
2. Click "Admin Dashboard" link (top right)
3. Or navigate directly to http://localhost:3000/admin

## Dashboard Features

### Overview Stats

- **Pending Review**: Submissions awaiting approval
- **Approved**: Total approved submissions
- **Rejected**: Total rejected submissions

### Pending Submissions

Each pending submission shows:

- Client name and debtor name
- Amount owed
- Claim description
- **Flagged reasons** (why it needs review)
- Submission date/time
- "View Full Letter" button
- **Approve** and **Reject** buttons

### Actions

#### Approve

1. Click "Approve" or view full letter first
2. Confirm approval
3. System automatically:
   - Marks submission as approved
   - Sends demand letter PDF to debtor
   - CCs client on the letter
   - Sends confirmation email to client

#### Reject

1. Click "Reject"
2. Confirm rejection
3. System marks as rejected
4. **Note**: Client is NOT automatically notified (you may want to handle this manually)

### Full Letter Preview

Click "View Full Letter" to see:
- Complete letter text
- Date, greeting, body, closing
- All details before approving

## Data Storage

Submissions are stored in:
```
/demand-letter-generator/data/submissions.json
```

This is a simple JSON file for development. For production, you should:
- Use a proper database (PostgreSQL, MongoDB, etc.)
- Add authentication to protect the admin dashboard
- Implement proper backup procedures

## Example Flagged Content

### What Gets Flagged:

❌ "You're a thief and need to pay NOW!!!"
- Reason: Personal attack, multiple exclamation marks

❌ "You ain't paid your damn rent"
- Reason: Informal language, profanity

❌ "Pay me or I'll sue you in court"
- Reason: Contains threatening keywords

### What Doesn't Get Flagged:

✅ "Unpaid rent for November 2024"
✅ "Outstanding invoice #1234 for services rendered"
✅ "Overdue payment for goods delivered"

## Security Considerations

⚠️ **Current State**: No authentication on admin dashboard
⚠️ **For Production**, you MUST add:

### 1. Authentication

Add password protection or OAuth:

```typescript
// Example middleware (not implemented)
if (!isAuthenticated(request)) {
  redirect('/login');
}
```

### 2. Environment Variable

Add admin password to `.env.local`:

```bash
ADMIN_PASSWORD=your_secure_password_here
```

### 3. Rate Limiting

Prevent brute force attacks on admin endpoints.

### 4. Audit Logging

Track who approved/rejected what and when.

## Production Recommendations

### Use a Database

Instead of JSON files, use:
- **PostgreSQL** with Prisma
- **MongoDB** with Mongoose
- **Firebase** for quick setup
- **Supabase** for hosted solution

### Add Authentication

Options:
- **NextAuth.js** - Easy OAuth integration
- **Clerk** - Complete auth solution
- **Auth0** - Enterprise-grade
- **Simple password** - Basic protection

### Email Notifications

Add email to notify clients when their submission is rejected:

```typescript
// In reject endpoint
await sendRejectionEmail({
  to: submission.letterData.client.clientEmail,
  reason: 'Content did not meet guidelines',
});
```

### Refund Handling

If you reject a submission, consider:
- Automatic Stripe refund
- Store credit for next submission
- Manual refund process

## Testing the Dashboard

### Create a Flagged Submission

1. Fill out the form with flagged content:
   - Claim: "You're a criminal and you owe me money!!!"
2. Submit and pay
3. Check admin dashboard → should appear in Pending

### Approve a Submission

1. Go to `/admin`
2. Click "View Full Letter"
3. Review content
4. Click "Approve"
5. Check the client and debtor emails

### Reject a Submission

1. Go to `/admin`
2. Click "Reject" on a submission
3. Confirm
4. Submission moves to "Rejected" status

## Troubleshooting

**Dashboard shows no submissions**
- Check if `/data/submissions.json` exists
- Submit a test letter with flagged content
- Check server logs for errors

**Approve/reject buttons don't work**
- Check browser console for errors
- Verify API endpoints are running
- Check server logs

**Emails not sending after approval**
- Verify Resend API key is configured
- Check server logs for email errors
- Test email service independently

## File Locations

```
app/
├── admin/
│   └── page.tsx                    # Admin dashboard UI
├── api/
│   └── admin/
│       └── submissions/
│           ├── route.ts            # Get all submissions
│           └── [id]/
│               ├── approve/
│               │   └── route.ts    # Approve endpoint
│               └── reject/
│                   └── route.ts    # Reject endpoint
lib/
└── submissionStore.ts              # Data storage functions
data/
└── submissions.json                # Submission data (auto-created)
```

## Next Steps

1. **Add authentication** before deploying to production
2. **Set up database** for better data management
3. **Add email templates** for rejected submissions
4. **Implement refund logic** for rejected submissions
5. **Add audit logging** to track admin actions
6. **Create analytics** to monitor flagged content patterns

## Support

For help:
- Check server logs in terminal
- Review `/data/submissions.json` file
- Test each endpoint independently
- Verify all environment variables are set

---

**Remember**: The admin dashboard is currently **unprotected**. Add authentication before deploying to production!
