import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { joinElectionWithCodeAndEmail } from "@/utils/electionAccess";
import { useAuth } from "@/hooks/useAuth";
import { KeyRound, Loader2 } from "lucide-react";

const JoinElection = () => {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Log in with your registered voter account first.",
        variant: "destructive",
      });
      navigate("/login?next=/");
      return;
    }

    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) {
      toast({
        title: "Invalid code",
        description: "Enter the election access code from your administrator.",
        variant: "destructive",
      });
      return;
    }

    const emailTrim = email.trim().toLowerCase();
    if (!emailTrim.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Enter the email that was added to this election.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await joinElectionWithCodeAndEmail(trimmed, emailTrim);
      toast({
        title: "Election unlocked",
        description: `Verify your face and palm for “${result.election.title}”.`,
      });
      navigate("/session-vote", { replace: true });
    } catch (err) {
      toast({
        title: "Could not join",
        description: err instanceof Error ? err.message : "Check the code, email, and registration.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto py-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="bg-primary text-primary-foreground p-3 rounded-full mb-4">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Join an election</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Sign in, enter the access code and your eligible email, then match your registered face
            and palm to vote.
          </p>
        </div>

        {!user ? (
          <Card>
            <CardHeader>
              <CardTitle>Sign in to continue</CardTitle>
              <CardDescription>
                You need a registered voter account with face and palm enrolled.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button asChild>
                <Link to="/login?next=/">Sign in</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/register">Register as voter</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Election access</CardTitle>
              <CardDescription>
                Signed in as {user.email}. Email must match your account and the eligible list.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="access-code">Access code</Label>
                  <Input
                    id="access-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. AB12CD34"
                    autoComplete="off"
                    className="tracking-[0.2em] font-mono text-lg uppercase"
                    maxLength={12}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="voter-email">Eligible email</Label>
                  <Input
                    id="voter-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={isSubmitting}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking…
                    </>
                  ) : (
                    "Continue to verification"
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Missing biometrics?{" "}
                  <Link to="/register" className="text-primary underline">
                    Complete registration
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default JoinElection;
