
import { supabase } from "@/integrations/supabase/client";

// Function to store voting history for a candidate
export async function storeVotingHistory(candidateId: string | number, electionId: string | number, votingData: any) {
  try {
    // Convert to string for UUIDs
    const candidateIdStr = String(candidateId);
    const electionIdStr = String(electionId);
    const fileName = `candidate_${candidateIdStr}_election_${electionIdStr}.json`;
    const filePath = `candidates/${candidateIdStr}/${fileName}`;
    
    // Convert data to JSON string
    const fileData = JSON.stringify(votingData, null, 2);
    
    // Convert string to Blob
    const blob = new Blob([fileData], { type: 'application/json' });
    
    // Upload to Supabase storage
    const { data, error } = await supabase
      .storage
      .from('voting_history')
      .upload(filePath, blob, {
        contentType: 'application/json',
        upsert: true
      });
    
    if (error) {
      // Don't throw error - storage is optional, just log it
      console.warn('Error storing voting history (non-critical):', error);
      // Return null instead of throwing to prevent blocking vote recording
      return null;
    }
    
    return data;
  } catch (error) {
    // Don't throw error - storage is optional, just log it
    console.warn('Failed to store voting history (non-critical):', error);
    // Return null instead of throwing to prevent blocking vote recording
    return null;
  }
}

// Function to retrieve voting history for a candidate
export async function getVotingHistory(candidateId: string | number, electionId: string | number) {
  try {
    const candidateIdStr = String(candidateId);
    const electionIdStr = String(electionId);
    const filePath = `candidates/${candidateIdStr}/candidate_${candidateIdStr}_election_${electionIdStr}.json`;
    
    // Get file from storage
    const { data, error } = await supabase
      .storage
      .from('voting_history')
      .download(filePath);
    
    if (error) {
      console.error('Error retrieving voting history:', error);
      throw error;
    }
    
    // Parse the JSON data
    const text = await data.text();
    return JSON.parse(text);
  } catch (error) {
    console.error('Failed to retrieve voting history:', error);
    return null;
  }
}

// Function to list all voting history files for a candidate
export async function listCandidateVotingHistory(candidateId: string | number) {
  try {
    const candidateIdStr = String(candidateId);
    const { data, error } = await supabase
      .storage
      .from('voting_history')
      .list(`candidates/${candidateIdStr}`);
    
    if (error) {
      console.error('Error listing voting history:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to list voting history:', error);
    return [];
  }
}

// Function to list all voting history files across all candidates
export async function listAllVotingHistory() {
  try {
    const { data, error } = await supabase
      .storage
      .from('voting_history')
      .list('candidates', {
        sortBy: { column: 'name', order: 'asc' }
      });
    
    if (error) {
      console.error('Error listing all voting history:', error);
      throw error;
    }
    
    // Get all subdirectories (candidate folders)
    const candidateFolders = data.filter(item => item.id.includes('/'));
    const allHistories = [];
    
    // For each candidate folder, list the files
    for (const folder of candidateFolders) {
      const candidateId = folder.name;
      const { data: candidateFiles, error: candidateError } = await supabase
        .storage
        .from('voting_history')
        .list(`candidates/${candidateId}`);
        
      if (!candidateError && candidateFiles) {
        allHistories.push(...candidateFiles.map(file => ({
          ...file,
          candidateId: parseInt(candidateId, 10)
        })));
      }
    }
    
    return allHistories;
  } catch (error) {
    console.error('Failed to list all voting history:', error);
    return [];
  }
}
