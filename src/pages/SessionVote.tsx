import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import FaceRecognition from "@/components/FaceRecognition";
import PalmRecognition from "@/components/PalmRecognition";
import StepIndicator from "@/components/vote/StepIndicator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import {
  castVoteWithSession,
  clearVoterSessionToken,
  completeSessionBiometrics,
  getSessionBallot,
  getVoterSessionToken,
  SessionBallot,
  SessionCandidate,
} from "@/utils/electionAccess";
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1, label: "Face" },
  { id: 2, label: "Palm" },
  { id: 3, label: "Vote" },
  { id: 4, label: "Done" },
];

const SessionVote = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [casting, setCasting] = useState(false);
  const [ballot, setBallot] = useState<SessionBallot | null>(null);
  const [selected, setSelected] = useState<SessionCandidate | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBallot = useCallback(async () => {
    if (!getVoterSessionToken()) {
      navigate("/", { replace: true });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getSessionBallot();
      setBallot(data);
      if (data.session.has_voted) {
        setStep(4);
        setTxHash("already-voted");
      } else if (data.session.face_verified && data.session.palm_verified) {
        setStep(3);
      } else if (data.session.face_verified) {
        setStep(2);
      } else {
        setStep(1);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Session invalid";
      setError(message);
      clearVoterSessionToken();
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadBallot();
  }, [loadBallot]);

  const handleFaceOk = async () => {
    try {
      await completeSessionBiometrics({ faceVerified: true });
      toast({ title: "Face verified", description: "Continue with palm verification." });
      setStep(2);
    } catch (err) {
      toast({
        title: "Could not save face verification",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const handlePalmOk = async () => {
    try {
      await completeSessionBiometrics({ palmVerified: true });
      toast({ title: "Palm verified", description: "You can now select a candidate." });
      await loadBallot();
      setStep(3);
    } catch (err) {
      toast({
        title: "Could not save palm verification",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const handleCast = async () => {
    if (!selected) {
      toast({
        title: "Select a candidate",
        description: "Choose who you want to vote for.",
        variant: "destructive",
      });
      return;
    }
    setCasting(true);
    try {
      const result = await castVoteWithSession(selected.id);
      setTxHash(result.transaction_hash);
      setStep(4);
      toast({ title: "Vote recorded", description: "Thank you for voting." });
    } catch (err) {
      toast({
        title: "Vote failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setCasting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your ballot…</p>
        </div>
      </Layout>
    );
  }

  if (error || !ballot) {
    return (
      <Layout>
        <div className="max-w-md mx-auto py-12">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Session unavailable</AlertTitle>
            <AlertDescription>{error || "Enter your election code again."}</AlertDescription>
          </Alert>
          <Button className="mt-4 w-full" onClick={() => navigate("/")}>
            Enter access code
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-wide">Voting session</p>
          <h1 className="text-2xl font-bold">{ballot.election.title}</h1>
          {ballot.election.description && (
            <p className="text-muted-foreground mt-1">{ballot.election.description}</p>
          )}
        </div>

        <StepIndicator steps={steps} currentStep={step} />

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Face verification</CardTitle>
              <CardDescription>
                Register and verify your face for this election. No account login is used.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FaceRecognition
                isRegistrationMode
                onVerified={handleFaceOk}
                onError={() =>
                  toast({
                    title: "Face verification failed",
                    description: "Please try again.",
                    variant: "destructive",
                  })
                }
              />
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Palm verification</CardTitle>
              <CardDescription>Complete palm verification to unlock the ballot.</CardDescription>
            </CardHeader>
            <CardContent>
              <PalmRecognition
                onVerified={handlePalmOk}
                onError={() =>
                  toast({
                    title: "Palm verification failed",
                    description: "Please try again.",
                    variant: "destructive",
                  })
                }
              />
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Select your candidate</CardTitle>
              <CardDescription>
                One vote per session. Your choice is recorded after you confirm.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {ballot.candidates.length === 0 ? (
                <Alert>
                  <AlertTitle>No candidates yet</AlertTitle>
                  <AlertDescription>
                    Ask the administrator to add candidates to this election.
                  </AlertDescription>
                </Alert>
              ) : (
                ballot.candidates.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelected(c)}
                    className={cn(
                      "w-full text-left rounded-lg border p-4 transition-colors",
                      selected?.id === c.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className="font-semibold">{c.name}</div>
                    {c.party && <div className="text-sm text-muted-foreground">{c.party}</div>}
                    {c.bio && <p className="text-sm mt-1 text-muted-foreground">{c.bio}</p>}
                  </button>
                ))
              )}
              <Button
                className="w-full mt-4"
                disabled={!selected || casting}
                onClick={handleCast}
              >
                {casting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Cast vote"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-3">
              <CheckCircle2 className="h-12 w-12 text-primary" />
              <h2 className="text-xl font-semibold">Vote complete</h2>
              <p className="text-muted-foreground max-w-sm">
                Your vote for {ballot.election.title} has been recorded. You can close this page.
              </p>
              {txHash && txHash !== "already-voted" && (
                <p className="text-xs font-mono text-muted-foreground break-all">Ref: {txHash}</p>
              )}
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    clearVoterSessionToken();
                    navigate("/");
                  }}
                >
                  Done
                </Button>
                <Button variant="secondary" onClick={() => navigate("/results")}>
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

export default SessionVote;
