# OTP Email Implementation - Setup Guide

## Overview
The OTP (One-Time Password) system has been updated to send verification codes via email instead of displaying them in the browser console.

## Components Created

### 1. **OTP Service** (`src/utils/otp/OTPService.ts`)
- Generates 6-digit OTP codes
- Sends OTP via email using Supabase Edge Functions
- Verifies OTP against database records
- Implements rate limiting and expiry (10 minutes)
- Prevents duplicate unverified OTPs per user

### 2. **OTP Types** (`src/types/otp.ts`)
- TypeScript interfaces for OTP requests/responses
- OTP record structure

### 3. **Database Migration** (`supabase/migrations/20250104_create_otp_requests.sql`)
- Creates `otp_requests` table
- Implements Row Level Security (RLS)
- Adds indexes for performance

### 4. **Supabase Edge Function** (`supabase/functions/send-otp/index.ts`)
- Serverless function to send emails
- Uses Resend.com API (free tier available)
- Beautiful HTML email templates
- CORS support

### 5. **Updated OTP Component** (`src/components/OTPVerification.tsx`)
- Removed client-side OTP generation
- Integrated with OTPService
- Now shows email sending status
- 6-digit OTP input (instead of 4)
- Real email verification

## Setup Instructions

### Step 1: Run Database Migration

Execute the migration SQL in your Supabase dashboard:
```bash
1. Go to Supabase Dashboard → SQL Editor
2. Create a new query with the content from: supabase/migrations/20250104_create_otp_requests.sql
3. Run the query
```

### Step 2: Set Up Email Service

#### Option A: Using Resend (Recommended)
1. Sign up at [resend.com](https://resend.com) (free tier available)
2. Get your API key
3. In Supabase Dashboard:
   - Go to Project Settings → Secrets
   - Add new secret: `RESEND_API_KEY` = your_api_key
4. Deploy the Edge Function (next step)

#### Option B: Using Supabase's Built-in Email Service
- Email is limited to transactional emails
- Requires Supabase Pro plan for custom domains
- Free plan uses Supabase's default sender

### Step 3: Deploy Edge Function

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Deploy the function
supabase functions deploy send-otp --project-id your_project_id

# Verify deployment
supabase functions list --project-id your_project_id
```

### Step 4: Test the Implementation

1. Start your development server: `npm run dev`
2. Navigate to the voting page: `http://localhost:8080/vote`
3. Complete face and palm verification
4. When you reach OTP verification step:
   - You should see "Sending verification code to your registered email..."
   - An email should arrive with your 6-digit OTP
   - Enter the code to verify

## Security Features

✅ **OTP never visible in console** - Only stored in database
✅ **OTP never shown in UI** - Only sent via email
✅ **10-minute expiry** - OTP automatically expires
✅ **3 attempts max** - Prevents brute force attacks
✅ **Rate limiting** - One OTP per user at a time
✅ **Email verification** - Confirms user has access to email
✅ **Database encryption** - RLS policies protect data
✅ **HTTPS only** - Secure transmission

## File Structure

```
src/
  ├── types/
  │   └── otp.ts (NEW)
  ├── utils/
  │   ├── otp/
  │   │   └── OTPService.ts (NEW)
  │   └── ...
  ├── components/
  │   ├── OTPVerification.tsx (UPDATED)
  │   └── ...
  └── ...

supabase/
  ├── migrations/
  │   └── 20250104_create_otp_requests.sql (NEW)
  ├── functions/
  │   └── send-otp/
  │       └── index.ts (NEW)
  └── ...
```

## Environment Variables

Required in Supabase:
- `RESEND_API_KEY` - Your Resend email service API key

## Troubleshooting

### Email not arriving
1. Check Supabase function logs: `supabase functions show send-otp`
2. Verify RESEND_API_KEY is set correctly
3. Check spam/junk folder
4. Ensure email address is correct in user account

### OTP verification failing
1. Check if OTP has expired (10 minutes)
2. Verify OTP matches exactly (case-sensitive)
3. Check for max attempts (3 attempts max)
4. Look at browser console for detailed errors

### Database migration errors
1. Ensure you're using the correct Supabase project
2. Check if table already exists
3. Verify RLS is enabled on the table

## Database Schema

```sql
Table: otp_requests
├── id (UUID) - Primary Key
├── user_id (UUID) - References auth.users
├── email (VARCHAR) - User email
├── otp_code (VARCHAR) - 6-digit OTP
├── created_at (TIMESTAMP) - Creation time
├── expires_at (TIMESTAMP) - Expiry time (10 min)
├── verified (BOOLEAN) - Verification status
└── attempts (INTEGER) - Failed attempt count

Indexes:
├── idx_otp_user_verified (user_id, verified)
└── idx_otp_expires (expires_at)
```

## API Endpoints

### sendOTP(email: string, userId: string)
- Generates and sends OTP
- Returns: `{ success: boolean, message: string, expiresIn?: number }`

### verifyOTP(userId: string, otp: string)
- Verifies OTP code
- Returns: `{ success: boolean, message: string }`

### resendOTP(userId: string, email: string)
- Generates new OTP and sends it
- Returns: `{ success: boolean, message: string }`

## Key Changes from Previous Implementation

| Before | After |
|--------|-------|
| 4-digit OTP | 6-digit OTP |
| Client-side generation | Server-side in database |
| Visible in console | Hidden, sent via email |
| Auto-fill & verify | Manual entry & verification |
| No expiry | 10-minute expiry |
| No security limits | 3-attempt limit |

## Next Steps

1. ✅ Deploy the database migration
2. ✅ Set up email service (Resend)
3. ✅ Deploy Supabase Edge Function
4. ✅ Test the implementation
5. Monitor email delivery in production

## Support

For issues with:
- **Email delivery**: Check Resend dashboard or Supabase function logs
- **Database**: Check Supabase dashboard and RLS policies
- **Frontend**: Check browser console for errors
