import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "securevote_voter_session";

export type SessionElection = {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  access_code?: string;
  is_active?: boolean;
};

export type SessionCandidate = {
  id: string;
  name: string;
  party: string | null;
  bio: string | null;
  photo_url: string | null;
  voteCount?: number;
};

export type JoinElectionResult = {
  session_token: string;
  session_id: string;
  expires_at: string;
  election: SessionElection;
};

export type SessionBallot = {
  session: {
    id: string;
    face_verified: boolean;
    palm_verified: boolean;
    has_voted: boolean;
    expires_at: string;
  };
  election: SessionElection;
  candidates: SessionCandidate[];
};

export function saveVoterSessionToken(token: string) {
  localStorage.setItem(SESSION_KEY, token);
}

export function getVoterSessionToken(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function clearVoterSessionToken() {
  localStorage.removeItem(SESSION_KEY);
}

function rpcErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: string }).message);
  }
  return "Something went wrong. Please try again.";
}

export async function joinElectionWithCode(code: string): Promise<JoinElectionResult> {
  const { data, error } = await supabase.rpc("join_election_with_code", {
    p_code: code.trim().toUpperCase(),
  });

  if (error) throw new Error(rpcErrorMessage(error));
  const result = data as JoinElectionResult;
  if (!result?.session_token) throw new Error("Failed to start voting session");
  saveVoterSessionToken(result.session_token);
  return result;
}

export async function completeSessionBiometrics(opts: {
  faceVerified?: boolean;
  palmVerified?: boolean;
  faceImageUrl?: string | null;
}) {
  const token = getVoterSessionToken();
  if (!token) throw new Error("No voting session. Enter your election code again.");

  const { data, error } = await supabase.rpc("complete_session_biometrics", {
    p_token: token,
    p_face_verified: opts.faceVerified ?? null,
    p_palm_verified: opts.palmVerified ?? null,
    p_face_image_url: opts.faceImageUrl ?? null,
  });

  if (error) throw new Error(rpcErrorMessage(error));
  return data;
}

export async function getSessionBallot(): Promise<SessionBallot> {
  const token = getVoterSessionToken();
  if (!token) throw new Error("No voting session. Enter your election code again.");

  const { data, error } = await supabase.rpc("get_session_ballot", {
    p_token: token,
  });

  if (error) throw new Error(rpcErrorMessage(error));
  return data as SessionBallot;
}

export async function castVoteWithSession(candidateId: string) {
  const token = getVoterSessionToken();
  if (!token) throw new Error("No voting session. Enter your election code again.");

  const { data, error } = await supabase.rpc("cast_vote_with_session", {
    p_token: token,
    p_candidate_id: candidateId,
  });

  if (error) throw new Error(rpcErrorMessage(error));
  return data as {
    vote_id: string;
    transaction_hash: string;
    election_id: string;
    candidate_id: string;
  };
}
