import { supabase } from '@/integrations/supabase/client';
import { OTPRequest, OTPVerifyRequest, OTPResponse } from '@/types/otp';

class OTPService {
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 3;

  /**
   * Generate and send OTP to user email
   */
  async sendOTP(email: string, userId: string): Promise<OTPResponse> {
    try {
      // Generate random 6-digit OTP
      const otpCode = this.generateOTP();
      
      console.log(`[OTP Service] Generating OTP for user: ${userId}, email: ${email}`);

   

      // Calculate expiry time (10 minutes from now)
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

      // Use upsert approach: delete existing, then insert (or update if delete fails)
      // First, try to get existing unverified OTP
      const { data: existingOTP } = await supabase
        .from('otp_requests')
        .select('id')
        .eq('user_id', userId)
        .eq('verified', false)
        .maybeSingle();

      let insertError = null;

      if (existingOTP) {
        // Update existing OTP record
        const { error: updateError } = await supabase
          .from('otp_requests')
          .update({
            email: email,
            otp_code: otpCode,
            expires_at: expiresAt.toISOString(),
            attempts: 0,
            verified: false
          })
          .eq('id', existingOTP.id);
        
        if (updateError) {
          console.error('[OTP Service] Error updating existing OTP:', updateError);
          // If update fails, try delete and insert
          const { error: deleteError } = await supabase
            .from('otp_requests')
            .delete()
            .eq('id', existingOTP.id);
          
          if (deleteError) {
            console.error('[OTP Service] Error deleting OTP:', deleteError);
            return {
              success: false,
              message: 'Failed to generate OTP. Please try again.',
              error: deleteError.message
            };
          }
          
          // Now try insert after delete
          const { error: insertErr } = await supabase
            .from('otp_requests')
            .insert({
              user_id: userId,
              email: email,
              otp_code: otpCode,
              expires_at: expiresAt.toISOString(),
              verified: false,
              attempts: 0
            });
          insertError = insertErr;
        }
      } else {
        // No existing OTP, try to insert
        const { error: insertErr } = await supabase
          .from('otp_requests')
          .insert({
            user_id: userId,
            email: email,
            otp_code: otpCode,
            expires_at: expiresAt.toISOString(),
            verified: false,
            attempts: 0
          });
        insertError = insertErr;

        // If insert fails due to unique constraint, try update
        if (insertError && insertError.code === '23505') {
          console.log('[OTP Service] Unique constraint hit, trying update instead');
          const { data: existing } = await supabase
            .from('otp_requests')
            .select('id')
            .eq('user_id', userId)
            .eq('verified', false)
            .maybeSingle();
          
          if (existing) {
            const { error: updateErr } = await supabase
              .from('otp_requests')
              .update({
                email: email,
                otp_code: otpCode,
                expires_at: expiresAt.toISOString(),
                attempts: 0,
                verified: false
              })
              .eq('id', existing.id);
            insertError = updateErr;
          }
        }
      }

      if (insertError) {
        console.error('[OTP Service] Error storing OTP:', insertError);
        return {
          success: false,
          message: 'Failed to generate OTP. Please try again.',
          error: insertError.message
        };
      }

      // Try to call edge function to send email (optional - graceful fallback)
      let emailSent = false;
      
      try {
        const { data, error: functionError } = await supabase.functions.invoke('send-otp', {
          body: {
            email: email,
            otp: otpCode,
            expiresIn: this.OTP_EXPIRY_MINUTES
          }
        });

        if (!functionError && data) {
          emailSent = true;
          console.log('[OTP Service] OTP email sent successfully via Edge Function to:', email);
        } else {
          // Check if it's a CORS or network error
          const errorMessage = functionError?.message || 'Unknown error';
          if (errorMessage.includes('CORS') || 
              errorMessage.includes('Failed to fetch') || 
              errorMessage.includes('network') ||
              errorMessage.includes('ERR_FAILED') ||
              errorMessage.includes('preflight')) {
            console.warn('[OTP Service] Edge Function CORS/Network error (likely not deployed):', errorMessage);
          } else {
            console.warn('[OTP Service] Edge Function error:', errorMessage);
          }
        }
      } catch (edgeFunctionError) {
        const errorMessage = edgeFunctionError instanceof Error ? edgeFunctionError.message : String(edgeFunctionError);
        
        // Check for CORS or network errors
        if (errorMessage.includes('CORS') || 
            errorMessage.includes('Failed to fetch') || 
            errorMessage.includes('network') ||
            errorMessage.includes('ERR_FAILED') ||
            errorMessage.includes('preflight')) {
          console.warn('[OTP Service] Edge Function not deployed or CORS issue. OTP will be shown in console for development.');
        } else {
          console.warn('[OTP Service] Edge Function call failed:', errorMessage);
        }
      }

      // For development: Log OTP to console if email wasn't sent
      if (!emailSent) {
        console.log(`[OTP Service] ⚠️ Edge Function not deployed. OTP for ${email}: ${otpCode}`);
        console.log(`[OTP Service] This OTP is valid for ${this.OTP_EXPIRY_MINUTES} minutes.`);
      }
      
      return {
        success: true,
        message: emailSent 
          ? `OTP sent to ${email}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes.`
          : `OTP generated. Check console for code (Edge Function not deployed). Valid for ${this.OTP_EXPIRY_MINUTES} minutes.`,
        expiresIn: this.OTP_EXPIRY_MINUTES * 60,
        // Include OTP in response for development (only if Edge Function failed)
        ...(process.env.NODE_ENV === 'development' && !emailSent ? { devOtp: otpCode } : {})
      };

    } catch (error) {
      console.error('[OTP Service] Unexpected error in sendOTP:', error);
      return {
        success: false,
        message: 'An unexpected error occurred. Please try again.',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Verify OTP code for user
   */
  async verifyOTP(userId: string, otpCode: string): Promise<OTPResponse> {
    try {
      console.log(`[OTP Service] Verifying OTP for user: ${userId}`);

      // Fetch the latest OTP request for this user
      const { data: otpRecords, error: fetchError } = await supabase
        .from('otp_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('verified', false)
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error('[OTP Service] Error fetching OTP:', fetchError);
        return {
          success: false,
          message: 'Failed to verify OTP. Please try again.',
          error: fetchError.message
        };
      }

      if (!otpRecords || otpRecords.length === 0) {
        // Check if user has a verified OTP (might have been verified already)
        const { data: verifiedOTP } = await supabase
          .from('otp_requests')
          .select('id, verified')
          .eq('user_id', userId)
          .eq('verified', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (verifiedOTP) {
          console.log('[OTP Service] User already has a verified OTP');
          return {
            success: true,
            message: 'OTP already verified.'
          };
        }
        
        console.warn('[OTP Service] No pending OTP found for user:', userId);
        return {
          success: false,
          message: 'No OTP found. Please request a new one.'
        };
      }

      const otpRecord = otpRecords[0];

      // Check if OTP is expired
      const expiresAt = new Date(otpRecord.expires_at);
      if (new Date() > expiresAt) {
        console.warn('[OTP Service] OTP expired for user:', userId);
        return {
          success: false,
          message: 'OTP has expired. Please request a new one.'
        };
      }

      // Check attempt limit
      if (otpRecord.attempts >= this.MAX_ATTEMPTS) {
        console.warn('[OTP Service] Max attempts reached for user:', userId);
        // Delete the OTP record
        await supabase
          .from('otp_requests')
          .delete()
          .eq('id', otpRecord.id);

        return {
          success: false,
          message: 'Maximum verification attempts exceeded. Please request a new OTP.'
        };
      }

      // Increment attempts
      const { error: updateError } = await supabase
        .from('otp_requests')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('id', otpRecord.id);

      if (updateError) {
        console.error('[OTP Service] Error updating attempts:', updateError);
      }

      // Verify OTP code - normalize both sides for comparison
      // Remove any whitespace and ensure both are strings
      const storedOtp = String(otpRecord.otp_code || '').trim().replace(/\s/g, '');
      const providedOtp = String(otpCode || '').trim().replace(/\s/g, '');
      
      console.log('[OTP Service] Comparing OTPs:', { 
        stored: storedOtp, 
        storedRaw: otpRecord.otp_code,
        storedType: typeof otpRecord.otp_code,
        provided: providedOtp,
        providedRaw: otpCode,
        providedType: typeof otpCode,
        match: storedOtp === providedOtp,
        storedLength: storedOtp.length,
        providedLength: providedOtp.length
      });
      
      if (storedOtp !== providedOtp) {
        console.warn('[OTP Service] Invalid OTP provided for user:', userId, {
          stored: storedOtp,
          provided: providedOtp
        });
        const remainingAttempts = this.MAX_ATTEMPTS - (otpRecord.attempts + 1);
        return {
          success: false,
          message: `Invalid OTP. ${remainingAttempts > 0 ? remainingAttempts + ' attempts remaining.' : 'Please request a new OTP.'}`
        };
      }

      // Mark OTP as verified
      const { error: verifyError } = await supabase
        .from('otp_requests')
        .update({ verified: true })
        .eq('id', otpRecord.id);

      if (verifyError) {
        console.error('[OTP Service] Error marking OTP as verified:', verifyError);
        return {
          success: false,
          message: 'Failed to verify OTP. Please try again.',
          error: verifyError.message
        };
      }

      console.log('[OTP Service] OTP verified successfully for user:', userId);
      
      return {
        success: true,
        message: 'OTP verified successfully.'
      };

    } catch (error) {
      console.error('[OTP Service] Unexpected error in verifyOTP:', error);
      return {
        success: false,
        message: 'An unexpected error occurred. Please try again.',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Check if user has a verified OTP
   */
  async hasVerifiedOTP(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('otp_requests')
        .select('id')
        .eq('user_id', userId)
        .eq('verified', true)
        .maybeSingle();

      if (error) {
        console.error('[OTP Service] Error checking verified OTP:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('[OTP Service] Error in hasVerifiedOTP:', error);
      return false;
    }
  }

  /**
   * Resend OTP (regenerate and send new OTP)
   */
  async resendOTP(userId: string, email: string): Promise<OTPResponse> {
    console.log(`[OTP Service] Resending OTP for user: ${userId}`);
    return this.sendOTP(email, userId);
  }

  /**
   * Generate random OTP code
   */
  private generateOTP(): string {
    const min = Math.pow(10, this.OTP_LENGTH - 1);
    const max = Math.pow(10, this.OTP_LENGTH) - 1;
    const randomOtp = Math.floor(Math.random() * (max - min + 1)) + min;
    return randomOtp.toString();
  }
}

// Export singleton instance
export const otpService = new OTPService();
