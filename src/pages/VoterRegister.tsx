import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import FaceRecognition from "@/components/FaceRecognition";
import PalmRecognition from "@/components/PalmRecognition";
import StepIndicator from "@/components/vote/StepIndicator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2, UserPlus } from "lucide-react";

const steps = [
  { id: 1, label: "Account" },
  { id: 2, label: "Face" },
  { id: 3, label: "Palm" },
  { id: 4, label: "Done" },
];

const VoterRegister = () => {
  const { user, signUp, signIn, isLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checkingBio, setCheckingBio] = useState(false);

  useEffect(() => {
    if (!user) {
      setStep(1);
      return;
    }
    let cancelled = false;
    (async () => {
      setCheckingBio(true);
      try {
        const { data } = await supabase
          .from("user_biometrics")
          .select("face_image_url, palm_image_url")
          .eq("user_id", user.id)
          .maybeSingle();
        if (cancelled) return;
        if (data?.face_image_url && data?.palm_image_url) {
          setStep(4);
        } else if (data?.face_image_url) {
          setStep(3);
        } else {
          setStep(2);
        }
      } finally {
        if (!cancelled) setCheckingBio(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({
        title: "Weak password",
        description: "Use at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Re-enter the same password.",
        variant: "destructive",
      });
      return;
    }
    try {
      await signUp(email.trim(), password, fullName.trim() || "Voter");
      // If email confirmation is off, session exists; otherwise sign in
      if (!user) {
        try {
          await signIn(email.trim(), password);
        } catch {
          /* signup toast already shown */
        }
      }
    } catch {
      /* useAuth shows toast */
    }
  };

  if (checkingBio) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto py-8">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="bg-primary text-primary-foreground p-3 rounded-full mb-4">
            <UserPlus className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Voter registration</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Create an account, then register your face and palm once. Admins must add your email
            to an election before you can vote.
          </p>
        </div>

        <StepIndicator steps={steps} currentStep={step} />

        {step === 1 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Create your account</CardTitle>
              <CardDescription>
                Already registered?{" "}
                <Link to="/login" className="text-primary underline">
                  Sign in
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    "Continue to face registration"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 2 && user && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Register your face</CardTitle>
              <CardDescription>Look at the camera. This is matched when you vote.</CardDescription>
            </CardHeader>
            <CardContent>
              <FaceRecognition
                isRegistrationMode
                onVerified={() => {
                  toast({ title: "Face saved", description: "Continue with palm registration." });
                  setStep(3);
                }}
              />
            </CardContent>
          </Card>
        )}

        {step === 3 && user && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Register your palm</CardTitle>
              <CardDescription>Show an open palm. Use the same hand when you vote.</CardDescription>
            </CardHeader>
            <CardContent>
              <PalmRecognition
                isRegistrationMode
                onVerified={() => {
                  toast({ title: "Registration complete" });
                  setStep(4);
                }}
              />
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card className="mt-6">
            <CardContent className="pt-8 flex flex-col items-center text-center gap-4">
              <CheckCircle2 className="h-14 w-14 text-green-600" />
              <h2 className="text-xl font-semibold">You&apos;re registered</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                When an admin adds <strong>{user?.email}</strong> to an election and shares the
                access code, sign in and join to vote.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
                <Button className="flex-1" onClick={() => navigate("/")}>
                  Join an election
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => navigate("/results")}>
                  View results
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default VoterRegister;
