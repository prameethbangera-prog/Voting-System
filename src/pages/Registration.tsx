
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { User, Camera, Mail, Phone, Home, Calendar, Hand, CheckCircle2 } from 'lucide-react';
import Layout from '@/components/Layout';
import StepIndicator from '@/components/vote/StepIndicator';
import PalmRecognition from '@/components/PalmRecognition';
import FaceRecognition from '@/components/FaceRecognition';

const Registration = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [dobError, setDobError] = useState<string>('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    dateOfBirth: '',
    selfieUploaded: false,
    palmVerified: false
  });
  
  const steps = [
    { id: 1, label: "Personal" },
    { id: 2, label: "Address" },
    { id: 3, label: "Biometrics" },
    { id: 4, label: "Confirm" }
  ];
  
  const updateFormData = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateDateOfBirth = (dateValue: string): string => {
    if (!dateValue) {
      return 'Date of birth is required.';
    }

    const dob = new Date(dateValue);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if date is valid
    if (isNaN(dob.getTime())) {
      return 'Please enter a valid date of birth.';
    }

    // Check if date is in the future
    if (dob > today) {
      return 'Date of birth cannot be in the future.';
    }

    // Check if user is at least 18 years old
    const age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    const dayDiff = today.getDate() - dob.getDate();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

    if (actualAge < 18) {
      return 'You must be at least 18 years old to register for voting.';
    }

    // Check if date is too far in the past (reasonable limit: 120 years)
    if (actualAge > 120) {
      return 'Please enter a valid date of birth.';
    }

    return '';
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    updateFormData('dateOfBirth', value);
    const error = validateDateOfBirth(value);
    setDobError(error);
  };

  const getMinDate = (): string => {
    const today = new Date();
    const maxAge = 120;
    const minDate = new Date(today.getFullYear() - maxAge, today.getMonth(), today.getDate());
    return minDate.toISOString().split('T')[0];
  };

  const getMaxDate = (): string => {
    const today = new Date();
    const minAge = 18;
    const maxDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
    return maxDate.toISOString().split('T')[0];
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // In a real app, you would upload this file to a server
      updateFormData('selfieUploaded', true);
      toast({
        title: "Photo Uploaded",
        description: "Your photo has been successfully uploaded.",
      });
    }
  };
  
  const handleFaceVerified = () => {
    updateFormData('selfieUploaded', true);
    toast({
      title: "Face Registration Successful",
      description: "Your face has been successfully registered.",
    });
  };
  
  const handlePalmVerified = () => {
    updateFormData('palmVerified', true);
    toast({
      title: "Palm Registration Successful",
      description: "Your palm biometrics have been successfully registered.",
    });
  };
  
  const validateCurrentStep = () => {
    if (step === 1) {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
        toast({
          title: "Incomplete Information",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return false;
      }
      
      // Simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address.",
          variant: "destructive",
        });
        return false;
      }
      
      // Simple phone validation
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(formData.phone.replace(/[^0-9]/g, ''))) {
        toast({
          title: "Invalid Phone Number",
          description: "Please enter a valid 10-digit phone number.",
          variant: "destructive",
        });
        return false;
      }
    }
    
    if (step === 2) {
      if (!formData.address || !formData.city || !formData.state || !formData.postalCode) {
        toast({
          title: "Incomplete Address",
          description: "Please fill in all address fields.",
          variant: "destructive",
        });
        return false;
      }
    }
    
    if (step === 3) {
      if (!formData.dateOfBirth) {
        toast({
          title: "Incomplete Information",
          description: "Please provide your date of birth.",
          variant: "destructive",
        });
        return false;
      }
      
      // Validate date of birth
      const dob = new Date(formData.dateOfBirth);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Check if date is valid
      if (isNaN(dob.getTime())) {
        toast({
          title: "Invalid Date",
          description: "Please enter a valid date of birth.",
          variant: "destructive",
        });
        return false;
      }
      
      // Check if date is in the future
      if (dob > today) {
        toast({
          title: "Invalid Date",
          description: "Date of birth cannot be in the future.",
          variant: "destructive",
        });
        return false;
      }
      
      // Check if user is at least 18 years old
      const age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      const dayDiff = today.getDate() - dob.getDate();
      
      const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
      
      if (actualAge < 18) {
        toast({
          title: "Age Requirement",
          description: "You must be at least 18 years old to register for voting.",
          variant: "destructive",
        });
        return false;
      }
      
      // Check if date is too far in the past (reasonable limit: 120 years)
      if (actualAge > 120) {
        toast({
          title: "Invalid Date",
          description: "Please enter a valid date of birth.",
          variant: "destructive",
        });
        return false;
      }
      
      if (!formData.selfieUploaded) {
        toast({
          title: "Face Recognition Required",
          description: "Please complete the face recognition step.",
          variant: "destructive",
        });
        return false;
      }
      
      if (!formData.palmVerified) {
        toast({
          title: "Palm Verification Required",
          description: "Please complete the palm verification step.",
          variant: "destructive",
        });
        return false;
      }
    }
    
    return true;
  };
  
  const handleNext = () => {
    if (!validateCurrentStep()) return;
    
    if (step < 4) {
      setStep(step + 1);
    }
  };
  
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };
  
  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;
    
    setIsLoading(true);
    
    // Simulate API call to register user
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Registration Successful",
        description: "Your voter registration has been completed. You can now access the voting system.",
      });
      navigate('/vote');
    }, 2000);
  };
  
  const renderPersonalInfoStep = () => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => updateFormData('firstName', e.target.value)}
              placeholder="Enter your first name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => updateFormData('lastName', e.target.value)}
              placeholder="Enter your last name"
              required
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateFormData('email', e.target.value)}
              placeholder="Enter your email address"
              className="pl-10"
              required
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => updateFormData('phone', e.target.value)}
              placeholder="Enter your phone number"
              className="pl-10"
              required
            />
          </div>
        </div>
      </div>
    );
  };
  
  const renderAddressStep = () => {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="address">Street Address</Label>
          <div className="relative">
            <Home className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => updateFormData('address', e.target.value)}
              placeholder="Enter your street address"
              className="pl-10"
              required
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => updateFormData('city', e.target.value)}
            placeholder="Enter your city"
            required
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={formData.state}
              onChange={(e) => updateFormData('state', e.target.value)}
              placeholder="Enter your state"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postalCode">Postal Code</Label>
            <Input
              id="postalCode"
              value={formData.postalCode}
              onChange={(e) => updateFormData('postalCode', e.target.value)}
              placeholder="Enter your postal code"
              required
            />
          </div>
        </div>
      </div>
    );
  };
  
  const renderBiometricsStep = () => {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={handleDobChange}
              onBlur={(e) => {
                const error = validateDateOfBirth(e.target.value);
                setDobError(error);
              }}
              min={getMinDate()}
              max={getMaxDate()}
              className={`pl-10 ${dobError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              required
            />
          </div>
          {dobError ? (
            <p className="text-sm font-medium text-destructive mt-1">{dobError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              You must be at least 18 years old to register for voting.
            </p>
          )}
        </div>
        
        {/* Face Registration */}
        <div className="space-y-2">
          <Label>Face Registration</Label>
          <Card className="p-4">
            <div className="mb-4">
              <p className="text-sm mb-2">Please register your face for identity verification</p>
              {formData.selfieUploaded ? (
                <div className="bg-green-50 text-green-700 p-3 rounded-md flex items-center">
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  <span>Face successfully registered</span>
                </div>
              ) : (
                <FaceRecognition 
                  onVerified={handleFaceVerified}
                  isRegistrationMode={true}
                />
              )}
            </div>
          </Card>
        </div>
        
        {/* Palm Registration */}
        <div className="space-y-2">
          <Label>Palm Registration</Label>
          <Card className="p-4">
            <div className="mb-4">
              <p className="text-sm mb-2">Please register your palm biometrics for additional security</p>
              {formData.palmVerified ? (
                <div className="bg-green-50 text-green-700 p-3 rounded-md flex items-center">
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  <span>Palm successfully registered</span>
                </div>
              ) : (
                <PalmRecognition 
                  onVerified={handlePalmVerified}
                />
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  };
  
  const renderConfirmationStep = () => {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border p-4 bg-slate-50">
          <h4 className="font-medium mb-2">Personal Information</h4>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <div className="text-muted-foreground">Name:</div>
            <div>{formData.firstName} {formData.lastName}</div>
            <div className="text-muted-foreground">Email:</div>
            <div>{formData.email}</div>
            <div className="text-muted-foreground">Phone:</div>
            <div>{formData.phone}</div>
          </div>
        </div>
        
        <div className="rounded-lg border p-4 bg-slate-50">
          <h4 className="font-medium mb-2">Address</h4>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <div className="text-muted-foreground">Street:</div>
            <div>{formData.address}</div>
            <div className="text-muted-foreground">City:</div>
            <div>{formData.city}</div>
            <div className="text-muted-foreground">State/Postal:</div>
            <div>{formData.state}, {formData.postalCode}</div>
          </div>
        </div>
        
        <div className="rounded-lg border p-4 bg-slate-50">
          <h4 className="font-medium mb-2">Identity Information</h4>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <div className="text-muted-foreground">Date of Birth:</div>
            <div>{formData.dateOfBirth}</div>
            <div className="text-muted-foreground">Face Registration:</div>
            <div>{formData.selfieUploaded ? "Completed" : "Not completed"}</div>
            <div className="text-muted-foreground">Palm Registration:</div>
            <div>{formData.palmVerified ? "Completed" : "Not completed"}</div>
          </div>
        </div>
        
        <div className="rounded-lg border p-4 bg-slate-100">
          <div className="flex items-start space-x-2">
            <div className="bg-primary/10 rounded-full p-1 mt-0.5">
              <User className="h-3 w-3 text-primary" />
            </div>
            <p className="text-sm">
              By clicking "Complete Registration", you agree to our Terms of Service
              and Privacy Policy. Your information will be securely stored and 
              used only for voting authentication purposes.
            </p>
          </div>
        </div>
      </div>
    );
  };
  
  const renderStep = () => {
    switch (step) {
      case 1:
        return renderPersonalInfoStep();
      case 2:
        return renderAddressStep();
      case 3:
        return renderBiometricsStep();
      case 4:
        return renderConfirmationStep();
      default:
        return null;
    }
  };
  
  return (
    <Layout>
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Voter Registration</h1>
        <p className="text-center mb-6 text-muted-foreground">
          Complete this registration to verify your identity and access the secure voting system
        </p>
        
        <div className="max-w-lg mx-auto">
          <StepIndicator currentStep={step} steps={steps} />
          
          <Card>
            <CardHeader>
              <CardTitle>
                {step === 1 && "Personal Information"}
                {step === 2 && "Residential Address"}
                {step === 3 && "Biometric Verification"}
                {step === 4 && "Review and Submit"}
              </CardTitle>
              <CardDescription>
                {step === 1 && "Enter your personal information"}
                {step === 2 && "Provide your residential address"}
                {step === 3 && "Register your biometrics for secure voting"}
                {step === 4 && "Review and confirm your information"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderStep()}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={handleBack}
                disabled={step === 1}
              >
                Back
              </Button>
              
              {step < 4 ? (
                <Button onClick={handleNext}>
                  Next
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : "Complete Registration"}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Registration;
