import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { joinElectionWithCode } from "@/utils/electionAccess";
import { KeyRound, Loader2 } from "lucide-react";

const JoinElection = () => {
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) {
      toast({
        title: "Invalid code",
        description: "Enter the election access code from your administrator.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await joinElectionWithCode(trimmed);
      toast({
        title: "Election unlocked",
        description: `Continue biometric verification for “${result.election.title}”.`,
      });
      navigate("/session-vote", { replace: true });
    } catch (err) {
      toast({
        title: "Could not join",
        description: err instanceof Error ? err.message : "Check the code and try again.",
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
            Voters do not create accounts. Enter the unique access code from your election admin,
            then complete face and palm verification to cast your vote.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Election access code</CardTitle>
            <CardDescription>
              Ask your administrator for the 8-character code created with the election.
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
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking code…
                  </>
                ) : (
                  "Continue to verification"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default JoinElection;
