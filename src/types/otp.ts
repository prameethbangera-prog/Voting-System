/**
 * OTP Request and Response types for email-based OTP verification
 */

export interface OTPRequest {
  email: string;
  userId: string;
}

export interface OTPVerifyRequest {
  userId: string;
  otp: string;
}

export interface OTPResponse {
  success: boolean;
  message: string;
  expiresIn?: number; // seconds
  error?: string;
}

export interface OTPRecord {
  id: string;
  user_id: string;
  email: string;
  otp_code: string;
  created_at: string;
  expires_at: string;
  verified: boolean;
  attempts: number;
}
