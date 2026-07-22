# CORS Error Fix Guide - OTP Edge Function

## Understanding the Error

The error you're seeing:
```
Access to fetch at 'https://gjhvlivqjudxruxjmyfa.supabase.co/functions/v1/send-otp' 
from origin 'http://localhost:8080' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
It does not have HTTP ok status.
```

### What This Means

1. **CORS Preflight Failure**: When your browser tries to call the Edge Function, it first sends an OPTIONS request (preflight) to check if the cross-origin request is allowed.

2. **Edge Function Not Deployed**: The most common cause is that the Edge Function hasn't been deployed to Supabase yet, so the preflight request fails (404 or 500 error).

3. **Current Behavior**: The app gracefully handles this - OTP is still generated and stored in the database, but email sending fails. The OTP is shown in the console/toast for development.

## Solutions

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

### Option 2: Continue Using Development Mode (Current Workaround)

The app already works in development mode:
- ✅ OTP is generated and stored in database
- ✅ OTP is shown in browser console
- ✅ OTP is shown in toast notification
- ✅ OTP verification works correctly

**To use it:**
1. Request OTP
2. Check browser console for the OTP code (e.g., `🔐 DEVELOPMENT OTP: 306462`)
3. Enter the OTP code in the verification form
4. Verification will work correctly

### Option 3: Fix CORS Headers (If Function is Deployed)

If the Edge Function is deployed but still showing CORS errors, check:

1. **Verify the Edge Function is deployed**:
   - Go to Supabase Dashboard → Edge Functions
   - Check if `send-otp` appears in the list

2. **Check the Edge Function code**:
   - The function should handle OPTIONS requests (preflight)
   - CORS headers should be included in all responses
   - See `supabase/functions/send-otp/index.ts` for reference

3. **Test the Edge Function directly**:
   ```bash
   curl -X OPTIONS https://gjhvlivqjudxruxjmyfa.supabase.co/functions/v1/send-otp \
     -H "Origin: http://localhost:8080" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type, Authorization" \
     -v
   ```
   
   Should return HTTP 200 with CORS headers.

## Current Status

✅ **OTP Generation**: Working (stored in database)  
✅ **OTP Verification**: Working (verifies against database)  
⚠️ **Email Sending**: Edge Function not deployed (OTP shown in console/toast for development)

## OTP Verification Issues

If you're experiencing issues with OTP verification:

1. **Check the OTP format**: Make sure you're entering all 6 digits
2. **Check console logs**: The app logs detailed OTP comparison information
3. **Verify OTP hasn't expired**: OTPs expire after 10 minutes
4. **Check attempt limit**: Maximum 3 attempts per OTP

The verification logs show:
```
[OTP Service] Comparing OTPs: Object
[OTP Service] OTP verified successfully
```

If verification is failing, check the console for the comparison details.

## Quick Test

To test if everything works:

1. **Generate OTP**: Click "Send OTP" or let it auto-send
2. **Check Console**: Look for `🔐 DEVELOPMENT OTP: XXXXXX`
3. **Enter OTP**: Type the 6-digit code from console
4. **Verify**: Should show "OTP Verified" success message

## Next Steps

1. **For Development**: Continue using console OTP (current behavior)
2. **For Production**: Deploy Edge Function using Option 1 above
3. **For Email**: Set up Resend API key or use Supabase email service

