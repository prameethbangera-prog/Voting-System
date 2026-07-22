
import React from 'react';
import Layout from '@/components/Layout';
import FaceRecognition from '@/components/FaceRecognition';
import PalmRecognition from '@/components/PalmRecognition';
import OTPVerification from '@/components/OTPVerification';
import StepIndicator from '@/components/vote/StepIndicator';
import VoteWelcome from '@/components/vote/VoteWelcome';
import ElectionSelector from '@/components/vote/ElectionSelector';
import CandidateSelector from '@/components/vote/CandidateSelector';
import VoteConfirmation from '@/components/vote/VoteConfirmation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useVoting } from '@/hooks/useVoting';
import { UserCheck, UserX, AlertTriangle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const Vote = () => {
  const {
    step,
    setStep,
    isLoading,
    elections,
    selectedElection,
    selectedCandidate,
    transactionHash,
    isBiometricsRegistered,
    isCheckingEligibility,
    handleFaceVerificationSuccess,
    handleFaceVerificationError,
    handlePalmVerificationSuccess,
    handlePalmVerificationError,
    handleOTPVerificationSuccess,
    handleOTPVerificationError,
    handleSelectElection,
    handleSelectCandidate,
    handleCastVote
  } = useVoting();
  
  const steps = [
    { id: 1, label: "Start" },
    { id: 2, label: "Face Scan" },
    { id: 3, label: "Palm Scan" },
    { id: 4, label: "OTP" },
    { id: 5, label: "Election" },
    { id: 6, label: "Vote" },
    { id: 7, label: "Confirm" }
  ];
  
  const renderEligibilityCheck = () => {
    if (isCheckingEligibility) {
      return (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <p className="text-center">Checking your voter registration status...</p>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    if (!isBiometricsRegistered) {
      return (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Registration Required</AlertTitle>
          <AlertDescription>
            <p className="mb-2">You must register your biometrics before you can vote.</p>
            <p>Please complete the biometric registration process to continue.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setStep(2)}
            >
              Register Biometrics
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    
    return (
      <Alert className="mb-6 bg-green-50 text-green-800 border-green-200">
        <UserCheck className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-700">Voter Verified</AlertTitle>
        <AlertDescription className="text-green-600">
          Your registration is complete. You can proceed with the voting process.
        </AlertDescription>
      </Alert>
    );
  };
  
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            {renderEligibilityCheck()}
            <VoteWelcome onNext={() => setStep(2)} />
          </>
        );
      
      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Facial Recognition</CardTitle>
              <CardDescription>
                Please position your face in front of the camera for verification.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FaceRecognition 
                onVerified={handleFaceVerificationSuccess} 
                onError={handleFaceVerificationError} 
              />
            </CardContent>
          </Card>
        );
      
      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Palm Recognition</CardTitle>
              <CardDescription>
                Please position your palm in front of the camera for verification.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PalmRecognition
                onVerified={handlePalmVerificationSuccess}
                onError={handlePalmVerificationError}
              />
            </CardContent>
          </Card>
        );
      
      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle>OTP Verification</CardTitle>
              <CardDescription>
                Enter the one-time password sent to your registered mobile device.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OTPVerification
                onVerified={handleOTPVerificationSuccess}
                onError={handleOTPVerificationError}
              />
            </CardContent>
          </Card>
        );
      
      case 5:
        return (
          <ElectionSelector 
            elections={elections}
            isLoading={isLoading}
            onSelectElection={handleSelectElection}
          />
        );
      
      case 6:
        return selectedElection ? (
          <CandidateSelector
            election={selectedElection}
            selectedCandidate={selectedCandidate}
            onSelectCandidate={handleSelectCandidate}
            onVote={handleCastVote}
            onBack={() => setStep(5)}
            isLoading={isLoading}
          />
        ) : null;
      
      case 7:
        return (
          <VoteConfirmation
            election={selectedElection}
            candidate={selectedCandidate}
            transactionHash={transactionHash}
          />
        );
      
      default:
        return null;
    }
  };
  
  return (
    <Layout>
      <div className="max-w-lg mx-auto">
        <StepIndicator currentStep={step} steps={steps} />
        {renderStep()}
      </div>
    </Layout>
  );
};

export default Vote;
