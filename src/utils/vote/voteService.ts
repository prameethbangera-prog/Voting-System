
import { supabase } from "@/integrations/supabase/client";

// Function to get voting history by user
export async function getUserVotingHistory(userId: string) {
  try {
    const { data, error } = await supabase
      .from('votes')
      .select(`
        election_id,
        candidate_id,
        transaction_hash,
        created_at
      `)
      .eq('voter_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to get user voting history:', error);
    return [];
  }
}

// Function to get all votes for analysis (admin only)
export async function getAllVotes() {
  try {
    const { data, error } = await supabase
      .from('votes')
      .select(`
        id,
        voter_id,
        election_id,
        candidate_id,
        created_at,
        transaction_hash
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to get all votes:', error);
    return [];
  }
}
