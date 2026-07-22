
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from '@/hooks/use-toast';
import { otpService } from '@/utils/otp/OTPService';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface OTPVerificationProps {
  onVerified: () => void;
  onError: () => void;
}

const OTPVerification: React.FC<OTPVerificationProps> = ({ onVerified, onError }) => {
  const { user } = useAuth();
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const timerRef = useRef<number | null>(null);
  const verificationTimeoutRef = useRef<number | null>(null);
  const currentOtpRef = useRef<string>(''); // Track current OTP value
  
  // Auto-send OTP when component mounts (only once)
  const hasSentOTP = React.useRef(false);
  
  useEffect(() => {
    if (user?.email && !otpSent && !isSending && !hasSentOTP.current) {
      hasSentOTP.current = true;
      handleSendOTP();
    }
    
    // Cleanup timer on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (verificationTimeoutRef.current) {
        clearTimeout(verificationTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  // Sync ref with state
  useEffect(() => {
    currentOtpRef.current = otp;
  }, [otp]);

  // Handle countdown timer
  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setResendDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [countdown]);
  
  const handleSendOTP = async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "Email address not found. Please log in again.",
        variant: "destructive",
      });
      onError();
      return;
    }

    setIsSending(true);
    
    try {
      const result = await otpService.sendOTP(user.email, user.id);
      
      if (result.success) {
        setOtpSent(true);
        setResendDisabled(true);
        setCountdown(30);
        setOtp('');
        
        // Show OTP in development if Edge Function failed
        const devOtp = (result as any).devOtp;
        if (devOtp) {
          toast({
            title: "OTP Generated (Development Mode)",
            description: `Edge Function not deployed. Your OTP is: ${devOtp}. Check console for details.`,
            duration: 10000,
          });
          console.log(`🔐 DEVELOPMENT OTP: ${devOtp} (valid for 10 minutes)`);
        } else {
          toast({
            title: "OTP Sent",
            description: `Verification code sent to ${user.email}`,
          });
        }
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to send OTP. Please try again.",
          variant: "destructive",
        });
        onError();
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast({
        title: "Error",
        description: "Failed to send OTP. Please try again.",
        variant: "destructive",
      });
      onError();
    } finally {
      setIsSending(false);
    }
  };
  
  const handleVerify = async () => {
    // Prevent verification if already verified
    if (isVerified) {
      console.log('[OTP Verification] Already verified, skipping');
      return;
    }
    
    // Use ref value if available, otherwise use state (ref is more reliable)
    const otpValue = currentOtpRef.current || otp;
    
    // Normalize OTP - remove any non-numeric characters and ensure it's exactly 6 digits
    const normalizedOtp = otpValue.replace(/\D/g, '').slice(0, 6);
    
    if (normalizedOtp.length < 6) {
      toast({
        title: "Incomplete OTP",
        description: `Please enter the complete 6-digit code. You entered ${normalizedOtp.length} digit(s).`,
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Error",
        description: "User information not available. Please log in again.",
        variant: "destructive",
      });
      onError();
      return;
    }
    
    // Prevent multiple simultaneous verification attempts
    if (isVerifying) {
      console.log('[OTP Verification] Verification already in progress, skipping');
      return;
    }
    
    setIsVerifying(true);
    
    try {
      console.log('[OTP Verification] Verifying OTP:', { 
        userId: user.id, 
        email: user.email,
        otp: normalizedOtp,
        otpLength: normalizedOtp.length,
        otpRaw: otp
      });
      
      // Use normalized OTP for verification
      const result = await otpService.verifyOTP(user.id, normalizedOtp);
      
      if (result.success) {
        console.log('[OTP Verification] ✅ Verification successful');
        setIsVerified(true); // Mark as verified to prevent duplicate attempts
        
        toast({
          title: "OTP Verified",
          description: "Your identity has been verified successfully",
        });
        
        // Call onVerified after a short delay to ensure state is updated
        setTimeout(() => {
          onVerified();
        }, 100);
      } else {
        console.warn('[OTP Verification] ❌ Verification failed:', result.message);
        
        // Check if error is because OTP was already verified
        if (result.message?.includes('No OTP found') || result.message?.includes('already verified')) {
          // If OTP was already verified, treat as success
          console.log('[OTP Verification] OTP already verified, treating as success');
          setIsVerified(true);
          setTimeout(() => {
            onVerified();
          }, 100);
          return;
        }
        
        toast({
          title: "Invalid OTP",
          description: result.message || "The code you entered doesn't match. Please try again.",
          variant: "destructive",
        });
        // Don't clear OTP immediately - let user see what they entered
        // setOtp('');
        onError();
      }
    } catch (error) {
      console.error('[OTP Verification] ❌ Error verifying OTP:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: "Error",
        description: `Failed to verify OTP: ${errorMessage}. Please try again.`,
        variant: "destructive",
      });
      onError();
    } finally {
      setIsVerifying(false);
    }
  };
  
  const handleResend = async () => {
    await handleSendOTP();
  };
  
  // Function to handle OTP change
  const handleOTPChange = (value: string) => {
    // Don't allow changes if already verified
    if (isVerified) {
      return;
    }
    
    // Only allow numeric input
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    
    // Update ref immediately for reliable access
    currentOtpRef.current = numericValue;
    setOtp(numericValue);
    
    // Clear any pending verification timeout
    if (verificationTimeoutRef.current) {
      clearTimeout(verificationTimeoutRef.current);
      verificationTimeoutRef.current = null;
    }
    
    // Auto-verify when 6 digits are entered
    if (numericValue.length === 6 && !isVerifying && !isVerified) {
      console.log('[OTP Verification] Auto-verifying OTP:', numericValue);
      // Use a delay to ensure state is fully updated and InputOTP component has processed the change
      verificationTimeoutRef.current = window.setTimeout(() => {
        // Use ref to get current value (more reliable than closure)
        const currentValue = currentOtpRef.current;
        if (!isVerified && !isVerifying && currentValue.length === 6) {
          console.log('[OTP Verification] Triggering auto-verify with:', currentValue);
          handleVerify();
        } else {
          console.log('[OTP Verification] Auto-verify skipped:', { 
            isVerified, 
            isVerifying, 
            length: currentValue.length 
          });
        }
      }, 400); // Slightly longer delay to ensure InputOTP has updated
    }
  };
  
  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          {!otpSent ? (
            "Sending verification code to your registered email..."
          ) : (
            <>
              Enter the 6-digit code sent to <br />
              <span className="font-medium text-foreground">{user?.email}</span>
            </>
          )}
        </p>
      </div>

      {!otpSent ? (
        <div className="w-full flex justify-center py-8">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Sending OTP...</span>
          </div>
        </div>
      ) : (
        <>
          <div className="w-full flex justify-center">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={handleOTPChange}
              pattern="[0-9]*"
              inputMode="numeric"
              containerClassName="gap-3 items-center justify-center"
              render={({ slots }) => (
                <InputOTPGroup>
                  {slots.map((slot, index) => (
                    <InputOTPSlot 
                      key={index} 
                      index={index}
                      aria-label={`Digit ${index + 1}`}
                      className="w-14 h-14 text-2xl font-bold border-2 border-input cursor-text focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:border-primary bg-background"
                    />
                  ))}
                </InputOTPGroup>
              )}
            />
          </div>
          
          <div className="flex flex-col w-full gap-2">
            <Button 
              onClick={handleVerify} 
              disabled={otp.length < 6 || isVerifying || isVerified}
              className="w-full"
            >
              {isVerified ? (
                '✓ Verified'
              ) : isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying
                </>
              ) : (
                'Verify Code'
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={resendDisabled || isSending}
              className="w-full"
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                </>
              ) : resendDisabled ? (
                `Resend code in ${countdown}s`
              ) : (
                "Didn't receive code? Resend"
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default OTPVerification;
