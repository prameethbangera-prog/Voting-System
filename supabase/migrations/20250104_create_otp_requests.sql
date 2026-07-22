-- Create OTP Requests table for email-based OTP verification
CREATE TABLE IF NOT EXISTS otp_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email varchar NOT NULL,
  otp_code varchar(6) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  verified boolean DEFAULT false,
  attempts integer DEFAULT 0
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_otp_user_verified ON otp_requests(user_id, verified);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_requests(expires_at);

-- Ensure we don't have multiple unverified OTPs for the same user
CREATE UNIQUE INDEX IF NOT EXISTS idx_otp_user_unverified ON otp_requests(user_id) WHERE verified = false;

-- Enable RLS (Row Level Security)
ALTER TABLE otp_requests ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own OTP requests
CREATE POLICY "Users can view their own OTP requests" ON otp_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own OTP requests
CREATE POLICY "Users can insert their own OTP requests" ON otp_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own OTP requests
CREATE POLICY "Users can update their own OTP requests" ON otp_requests
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to delete their own OTP requests
CREATE POLICY "Users can delete their own OTP requests" ON otp_requests
  FOR DELETE
  USING (auth.uid() = user_id);
