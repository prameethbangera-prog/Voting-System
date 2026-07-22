# Deploy Edge Function for OTP

## Issue
The OTP service is trying to call a Supabase Edge Function (`send-otp`) that hasn't been deployed yet, causing CORS errors.

## Solution Options

### Option 1: Deploy the Edge Function (Recommended for Production)

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref gjhvlivqjudxruxjmyfa
   ```

4. **Deploy the Edge Function**:
   ```bash
   supabase functions deploy send-otp
   ```

5. **Set Environment Variables** (if using Resend for email):
   - Go to Supabase Dashboard → Edge Functions → send-otp → Settings
   - Add secret: `RESEND_API_KEY` = your Resend API key
   - Or use Supabase's built-in email service

### Option 2: Use Supabase Built-in Email (Alternative)

The Edge Function uses Resend API. You can modify it to use Supabase's built-in email service instead.

### Option 3: Development Mode (Current Workaround)

The OTP service now works in development mode:
- OTP is generated and stored in database
- OTP is logged to console if Edge Function fails
- OTP is shown in toast notification for development
- You can manually enter the OTP from console

## Current Status

✅ **OTP Generation**: Working (stored in database)
✅ **OTP Verification**: Working (verifies against database)
⚠️ **Email Sending**: Edge Function not deployed (OTP shown in console/toast for development)

## Testing OTP

1. OTP is generated and stored in `otp_requests` table
2. Check browser console for the OTP code (in development mode)
3. Enter the OTP code shown in console/toast
4. Verification will work correctly

## Next Steps

1. Deploy the Edge Function using Option 1 above
2. Or configure Supabase email service
3. Or continue using development mode (OTP in console)





