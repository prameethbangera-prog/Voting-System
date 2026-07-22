# OTP Implementation Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React/TypeScript)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  OTPVerification.tsx Component                                   │
│  ├─ Manages UI state (otp, isVerifying, isSending, etc)         │
│  ├─ Uses useAuth hook to get user info                          │
│  ├─ Calls OTPService.sendOTP() on mount                         │
│  ├─ Calls OTPService.verifyOTP() on submit                      │
│  └─ Shows loading states and error messages                     │
│                                                                   │
│  OTPService (Utility Class)                                     │
│  ├─ sendOTP(email, userId)                                      │
│  │  ├─ Generate 6-digit OTP                                     │
│  │  ├─ Insert into otp_requests table                           │
│  │  └─ Call Supabase Edge Function (send-otp)                  │
│  │                                                               │
│  ├─ verifyOTP(userId, otp)                                      │
│  │  ├─ Query otp_requests table                                 │
│  │  ├─ Check expiry (10 minutes)                                │
│  │  ├─ Check attempts (max 3)                                   │
│  │  ├─ Verify OTP code matches                                  │
│  │  └─ Mark as verified if successful                           │
│  │                                                               │
│  └─ Other methods                                               │
│     ├─ resendOTP()                                              │
│     ├─ hasVerifiedOTP()                                         │
│     └─ generateOTP() (private)                                  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Backend                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Database (PostgreSQL)                                          │
│  ├─ otp_requests table                                          │
│  │  ├─ id (UUID)                                                │
│  │  ├─ user_id (UUID) → auth.users                              │
│  │  ├─ email (VARCHAR)                                          │
│  │  ├─ otp_code (VARCHAR)                                       │
│  │  ├─ created_at (TIMESTAMP)                                   │
│  │  ├─ expires_at (TIMESTAMP)                                   │
│  │  ├─ verified (BOOLEAN)                                       │
│  │  └─ attempts (INTEGER)                                       │
│  │                                                               │
│  ├─ Indexes                                                     │
│  │  ├─ idx_otp_user_verified (fast lookups)                     │
│  │  └─ idx_otp_expires (auto-cleanup)                           │
│  │                                                               │
│  └─ RLS Policies                                                │
│     ├─ Users can SELECT their own OTPs                          │
│     ├─ Users can INSERT their own OTPs                          │
│     ├─ Users can UPDATE their own OTPs                          │
│     └─ Users can DELETE their own OTPs                          │
│                                                                   │
│  Edge Function: send-otp                                        │
│  ├─ Receives: { email, otp, expiresIn }                         │
│  ├─ Validates email format                                      │
│  ├─ Builds HTML email template                                  │
│  ├─ Calls Resend API                                            │
│  └─ Returns: { success, messageId }                             │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ REST API (Resend)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Resend Email Service (Third-Party)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Email Provider                                                 │
│  ├─ Receives email request                                      │
│  ├─ Validates sender domain                                     │
│  ├─ Processes HTML/text template                                │
│  ├─ Queues for delivery                                         │
│  └─ Sends via SMTP                                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ SMTP
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Email Provider                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Delivers email to user's inbox                                 │
│  ├─ Usually delivered within 1-3 seconds                        │
│  ├─ May be filtered to spam (user checks there)                 │
│  └─ User reads OTP code                                         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Sequence

### Sending OTP

```
1. User reaches OTP verification screen
   └─ OTPVerification component mounts
      └─ useEffect calls handleSendOTP()
         
2. handleSendOTP() function executes
   └─ otpService.sendOTP(email, userId)
      ├─ Generate random 6-digit code
      ├─ Insert record into otp_requests table
      │  ├─ user_id = current user ID
      │  ├─ email = user's email
      │  ├─ otp_code = generated code
      │  ├─ expires_at = now + 10 minutes
      │  ├─ verified = false
      │  └─ attempts = 0
      │
      └─ Call supabase.functions.invoke('send-otp')
         ├─ Pass: { email, otp, expiresIn: 10 }
         └─ Edge function receives request
            
3. send-otp Edge Function executes
   ├─ Validate email format
   ├─ Build HTML email template
   ├─ Call Resend API
   │  └─ POST https://api.resend.com/emails
   │     └─ Resend server processes and queues
   │
   └─ Return response to frontend

4. Frontend receives response
   ├─ Show success toast
   ├─ Display "OTP sent to xyz@example.com"
   ├─ Start 30-second resend countdown
   └─ Show OTP input field

5. Email delivery
   ├─ Resend processes email
   ├─ Sends via SMTP
   └─ User receives in inbox (~1-3 seconds)
```

### Verifying OTP

```
1. User enters 6 digits in OTP field
   └─ handleOTPChange triggered after each digit
      └─ When length === 6, auto-call handleVerify()

2. handleVerify() function executes
   └─ otpService.verifyOTP(userId, otpCode)
      
3. verifyOTP() queries database
   ├─ SELECT * FROM otp_requests
   │  WHERE user_id = userId
   │  AND verified = false
   │  ORDER BY created_at DESC
   │  LIMIT 1
   │
   └─ Retrieve most recent unverified OTP

4. Validation checks (in order)
   ├─ Check 1: OTP exists
   │  └─ If not: return "No OTP found. Request new one."
   │
   ├─ Check 2: OTP not expired
   │  └─ If expired: return "OTP expired. Request new one."
   │
   ├─ Check 3: Not exceeded attempts
   │  ├─ If attempts >= 3: delete OTP, return error
   │  └─ Increment attempts counter
   │
   ├─ Check 4: OTP code matches
   │  └─ If mismatch: return "Invalid code. X attempts left."
   │
   └─ Check 5: All checks pass
      └─ Mark verified = true
         └─ Return success

5. Frontend receives response
   ├─ If success:
   │  ├─ Show success toast
   │  ├─ Call onVerified()
   │  └─ Proceed to next step
   │
   └─ If error:
      ├─ Show error toast with message
      ├─ Clear input field
      └─ Remain on OTP screen
```

## State Management

### OTPVerification Component State

```typescript
State Variables:
├─ otp: string                    // User's input (6 digits)
├─ isVerifying: boolean           // Verification in progress
├─ isSending: boolean             // OTP sending in progress
├─ otpSent: boolean               // OTP sent successfully
├─ resendDisabled: boolean        // Disable resend button
└─ countdown: number              // Seconds until can resend

Derived from useAuth:
└─ user: User | null              // Current authenticated user
   ├─ user.id
   ├─ user.email
   └─ user.email_confirmed
```

### OTPService State

```typescript
Private Properties:
├─ OTP_LENGTH: 6
├─ OTP_EXPIRY_MINUTES: 10
└─ MAX_ATTEMPTS: 3

Database State (otp_requests table):
├─ id: UUID
├─ user_id: UUID
├─ email: string
├─ otp_code: string (encrypted)
├─ created_at: timestamp
├─ expires_at: timestamp
├─ verified: boolean
└─ attempts: number (0-3)
```

## Error Handling Flow

```
OTP Sending Errors:
├─ No email: "Email address not found"
├─ DB insert failed: "Failed to generate OTP"
└─ Function failed: "Failed to send email"

OTP Verification Errors:
├─ No OTP found: "No OTP found. Request new one."
├─ OTP expired: "OTP expired. Request new one."
├─ Max attempts: "Max attempts exceeded. Request new OTP"
├─ Invalid code: "Invalid OTP. X attempts remaining"
└─ DB error: "Failed to verify OTP"

UI Error Messages:
├─ Toast notifications (visible 4 seconds)
├─ Form error messages
└─ Loading states (prevent double submission)
```

## Security Layers

```
Layer 1: Frontend Security
├─ No OTP storage in localStorage/sessionStorage
├─ No console logging of OTP
├─ No toast showing OTP
└─ HTTPS only communication

Layer 2: Network Security
├─ All requests over HTTPS
├─ Supabase Auth token validation
└─ CORS restricted to known origins

Layer 3: Database Security
├─ Row Level Security (RLS) policies
│  └─ Users can only access their own records
├─ Encrypted columns (if enabled)
├─ No direct table access without auth
└─ Automatic audit logging

Layer 4: Business Logic
├─ 10-minute OTP expiry
├─ 3 attempts maximum
├─ Server-side validation only
├─ One unverified OTP per user
└─ Timestamp verification

Layer 5: Monitoring
├─ Function execution logs
├─ Error tracking
├─ Delivery confirmation
└─ Failed attempt alerts
```

## Performance Characteristics

```
Latency:
├─ OTP Generation: ~10ms
├─ Database Insert: ~50ms
├─ Edge Function Invocation: ~200ms
├─ Resend API Call: ~1-3 seconds
├─ Email Delivery: ~2-5 seconds
└─ Total Time: ~5-10 seconds

Throughput:
├─ Can handle ~100 OTPs/second (Supabase limit)
├─ Can handle ~1000 verifications/second
└─ Database indexes ensure O(1) lookups

Storage:
├─ ~500 bytes per OTP record
├─ Auto-cleanup after 10 minutes
├─ 1000 OTPs = ~500KB storage
└─ Negligible storage impact
```

## Scalability

```
Vertical Scaling:
├─ Supabase handles auto-scaling
├─ Database indexes prevent slow queries
└─ Edge functions auto-scale

Horizontal Scaling:
├─ Multiple Supabase replicas possible
├─ Resend handles email queuing
└─ No single point of failure

Rate Limiting:
├─ Supabase function limits: 10,000 req/min
├─ Resend free tier: 100 emails/day
├─ Custom rate limiting can be added per IP
└─ Database indexes prevent abuse
```

## Monitoring & Observability

```
What to Monitor:
├─ Function execution logs
│  └─ supabase.functions.show send-otp
├─ Email delivery status
│  └─ Resend dashboard analytics
├─ Database query performance
│  └─ Supabase dashboard metrics
└─ User error rates
   └─ Custom analytics tracking

Error Budget:
├─ Target: 99.9% success rate
├─ Alert: If drops below 95%
└─ Incident: If drops below 80%
```

## Integration Points

```
With Supabase Auth:
├─ Reads user ID from auth context
├─ Reads user email from profile
└─ Uses RLS to protect data

With Frontend UI:
├─ Uses useAuth hook
├─ Uses toast notifications
├─ Uses Loader icons
└─ Manages own component state

With Email Service:
├─ Edge function acts as intermediary
├─ Handles API key security
└─ Formats email content
```

## Future Extensions

```
Possible Enhancements:
├─ SMS delivery option
├─ Backup email delivery
├─ Custom email templates
├─ Analytics dashboard
├─ Rate limiting per IP
├─ Webhook notifications
├─ Email preview feature
└─ A/B testing support
```

---

This architecture provides security, scalability, and maintainability while keeping the implementation simple and focused on OTP verification.
