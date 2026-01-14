# Email Setup Guide (SendGrid)

## Required Environment Variables

Add these to your `.env` file:

```env
# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=Job Portal

# App URL (for email links)
NEXT_PUBLIC_APP_URL=http://localhost:3000
# Or for production:
# NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## How to Get SendGrid API Key

1. Go to [SendGrid](https://sendgrid.com/) and sign up/login
2. Navigate to **Settings** → **API Keys**
3. Click **Create API Key**
4. Give it a name (e.g., "Job Portal Production")
5. Select **Full Access** or **Restricted Access** with Mail Send permissions
6. Copy the API key and add it to your `.env` file

## Verify Sender Identity

Before sending emails, you need to verify your sender email:

1. Go to **Settings** → **Sender Authentication**
2. Choose **Single Sender Verification** or **Domain Authentication**
3. Follow the verification steps
4. Use the verified email in `SENDGRID_FROM_EMAIL`

## Email Features Implemented

✅ **Registration Emails**
- Welcome email sent on registration
- OTP verification email sent automatically

✅ **OTP Verification**
- Email OTP sent via `/api/auth/send-otp`
- Phone OTP (SMS) - TODO: Integrate Twilio

✅ **Password Reset**
- Password reset email via `/api/auth/forgot-password`

## Testing

1. Make sure all environment variables are set
2. Register a new user with a valid email
3. Check your email inbox (and spam folder)
4. You should receive:
   - Welcome email
   - OTP verification email

## Troubleshooting

### Emails not sending?

1. **Check SendGrid API Key**
   ```bash
   echo $SENDGRID_API_KEY
   ```
   Should show your API key

2. **Check SendGrid Dashboard**
   - Go to SendGrid → Activity
   - Check if emails are being sent
   - Look for any error messages

3. **Check Server Logs**
   - Look for "Email sent successfully" or error messages
   - Check console for SendGrid errors

4. **Verify Sender Email**
   - Make sure `SENDGRID_FROM_EMAIL` is verified in SendGrid
   - Unverified emails will be rejected

5. **Check Email Limits**
   - Free SendGrid accounts have daily limits
   - Check your SendGrid dashboard for usage

### Common Errors

- **401 Unauthorized**: Invalid API key
- **403 Forbidden**: Sender email not verified
- **429 Too Many Requests**: Rate limit exceeded

## Next Steps

- [ ] Integrate SMS OTP via Twilio
- [ ] Add email templates for job notifications
- [ ] Set up email webhooks for delivery tracking
- [ ] Configure SPF/DKIM records for better deliverability

