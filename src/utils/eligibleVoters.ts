import { supabase } from "@/integrations/supabase/client";

export type EligibleVoter = {
  id: string;
  email: string;
  created_at: string;
};

function rpcErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: string }).message);
  }
  return "Something went wrong. Please try again.";
}

export async function listEligibleVoters(electionId: string): Promise<EligibleVoter[]> {
  const { data, error } = await supabase.rpc("list_election_eligible_voters", {
    p_election_id: electionId,
  });
  if (error) throw new Error(rpcErrorMessage(error));
  return (data as EligibleVoter[]) ?? [];
}

export async function addEligibleVoter(electionId: string, email: string) {
  const { data, error } = await supabase.rpc("add_election_eligible_voter", {
    p_election_id: electionId,
    p_email: email.trim().toLowerCase(),
  });
  if (error) throw new Error(rpcErrorMessage(error));
  return data as { id: string; email: string; election_id: string };
}

export async function removeEligibleVoter(electionId: string, email: string) {
  const { data, error } = await supabase.rpc("remove_election_eligible_voter", {
    p_election_id: electionId,
    p_email: email.trim().toLowerCase(),
  });
  if (error) throw new Error(rpcErrorMessage(error));
  return data;
}

/** Parse pasted emails (comma, semicolon, or newline separated). */
export function parseEmailList(raw: string): string[] {
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const part of raw.split(/[\s,;]+/)) {
    const e = part.trim().toLowerCase();
    if (!e || !e.includes("@")) continue;
    if (seen.has(e)) continue;
    seen.add(e);
    emails.push(e);
  }
  return emails;
}
