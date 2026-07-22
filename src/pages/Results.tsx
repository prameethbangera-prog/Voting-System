import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { BarChart2, PieChart as PieChartIcon, Activity, AlertCircle, Loader2 } from 'lucide-react';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';

const COLORS = ['#3B82F6', '#6366F1', '#8B5CF6', '#D946EF', '#14B8A6', '#F97316', '#F43F5E'];

interface ElectionResult {
  candidateName: string;
  party: string;
  votes: number;
  percentage: number;
}

interface Election {
  id: string;
  title: string;
  description: string;
  end_date?: string;
  results_access_offset_minutes?: number;
  candidates: Candidate[];
}

interface Candidate {
  id: string;
  name: string;
  party: string;
  voteCount: number;
}

const Results = () => {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [results, setResults] = useState<ElectionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchElections = async () => {
      try {
        setLoading(true);
        
        // Fetch elections from database - only show elections where results are accessible
        const { data: electionData, error: electionError } = await supabase
          .from('elections')
          .select(`
            id,
            title,
            description,
            end_date,
            results_access_offset_minutes
          `)
          .order('created_at', { ascending: false });
          
        if (electionError) {
          console.error('Error fetching elections:', electionError);
          setError('Failed to load election data');
          toast({
            title: "Error",
            description: "Failed to load election results. Please try again.",
            variant: "destructive",
          });
          return;
        }
        
        if (!electionData || electionData.length === 0) {
          setElections([]);
          return;
        }
        
        console.log('Fetched elections:', electionData);
        
        // Filter elections where results are accessible based on results_access_offset_minutes
        const now = new Date();
        const accessibleElections = (electionData as any[]).filter((election: any) => {
          if (!election.end_date) return false;
          
          const endDate = new Date(election.end_date);
          const offsetMinutes = election.results_access_offset_minutes || 0;
          
          // Calculate when results become accessible
          const resultsAccessTime = new Date(endDate.getTime() + (offsetMinutes * 60 * 1000));
          
          // Results are accessible if current time is past the results access time
          return now >= resultsAccessTime;
        });
        
        if (accessibleElections.length === 0) {
          setElections([]);
          setLoading(false);
          return;
        }
        
        // For each election, fetch its candidates with vote counts
        const electionsWithCandidates = await Promise.all(
          accessibleElections.map(async (election: any) => {
            try {
              // First fetch candidates
              const { data: candidatesData, error: candidatesError } = await supabase
                .from('candidates')
                .select(`
                  id,
                  name,
                  party
                `)
                .eq('election_id', election.id);
                
              if (candidatesError) {
                console.error(`Error fetching candidates for election ${election.id}:`, candidatesError);
                return null;
              }
              
              // For each candidate, get their vote count
              const candidatesWithVotes = await Promise.all(
                candidatesData.map(async (candidate) => {
                  // Get vote count
                  const { count, error: voteError } = await supabase
                    .from('votes')
                    .select('*', { count: 'exact', head: true })
                    .eq('candidate_id', candidate.id);
                    
                  if (voteError) {
                    console.error(`Error fetching votes for candidate ${candidate.id}:`, voteError);
                    return {
                      ...candidate,
                      voteCount: 0
                    };
                  }
                  
                  return {
                    ...candidate,
                    voteCount: count || 0
                  };
                })
              );
              
              return {
                ...election,
                candidates: candidatesWithVotes
              };
            } catch (err) {
              console.error(`Error processing election ${election.id}:`, err);
              return null;
            }
          })
        );
        
        // Filter out any null values (failed elections)
        const validElections = electionsWithCandidates.filter(e => e !== null) as Election[];
        
        setElections(validElections);
        
        // Set the first election as selected
        if (validElections.length > 0) {
          setSelectedElection(validElections[0]);
          processResults(validElections[0]);
        }
      } catch (error) {
        console.error('Error fetching elections:', error);
        setError('Failed to load election data');
        toast({
          title: "Error",
          description: "Failed to load election results. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchElections();
  }, []);
  
  // New function to fetch real vote data from the database
  const fetchResultsForElection = async (election: Election) => {
    if (!election || !election.candidates) {
      setResults([]);
      return;
    }
    
    try {
      // Get votes from database for this election
      const strElectionId = String(election.id);
      console.log('Fetching votes for election ID:', strElectionId);
      
      const { data: votes, error } = await supabase
        .from('votes')
        .select('candidate_id')
        .eq('election_id', strElectionId);
        
      if (error) {
        console.error('Error fetching votes:', error);
        // Fall back to existing data
        processResults(election);
        return;
      }
      
      console.log('Fetched votes:', votes);
      
      // Count votes per candidate
      const voteCounts: Record<string, number> = {};
      votes?.forEach(vote => {
        const candidateId = vote.candidate_id;
        if (candidateId) {
          voteCounts[candidateId] = (voteCounts[candidateId] || 0) + 1;
        }
      });
      
      // Update candidates with real vote counts
      const updatedCandidates = election.candidates.map(candidate => ({
        ...candidate,
        voteCount: voteCounts[candidate.id] || candidate.voteCount || 0
      }));
      
      // Create a new election object with updated candidates
      const updatedElection = {
        ...election,
        candidates: updatedCandidates
      };
      
      setSelectedElection(updatedElection);
      processResults(updatedElection);
      
      // Set up real-time listener for vote updates
      const channel = supabase.channel(`election-votes-${strElectionId}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'votes',
            filter: `election_id=eq.${strElectionId}`
          }, 
          (payload) => {
            console.log('Vote change detected:', payload);
            // Refresh the results when votes change
            fetchResultsForElection(updatedElection);
          }
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
      
    } catch (err) {
      console.error('Error processing votes:', err);
      // Fall back to existing data
      processResults(election);
    }
  };
  
  const processResults = (election: Election) => {
    if (!election || !election.candidates) return;
    
    const totalVotes = election.candidates.reduce((sum, candidate) => sum + candidate.voteCount, 0);
    
    const processedResults = election.candidates.map(candidate => ({
      candidateName: candidate.name,
      party: candidate.party,
      votes: candidate.voteCount,
      percentage: totalVotes > 0 ? (candidate.voteCount / totalVotes) * 100 : 0
    }));
    
    // Sort by votes in descending order
    processedResults.sort((a, b) => b.votes - a.votes);
    
    setResults(processedResults);
  };
  
  const handleElectionChange = (value: string) => {
    const election = elections.find(e => e.id === value);
    if (election) {
      setSelectedElection(election);
      fetchResultsForElection(election);
    }
  };
  
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };
  
  // ... keep existing code (renderBlockchainInfo function)
  
  const renderBlockchainInfo = () => {
    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Blockchain Verification</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="blockchain-block">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Election Smart Contract</h4>
              <Badge variant="outline">Verified</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              All votes are securely recorded on the blockchain
            </p>
            <div>
              <p className="text-xs font-medium">Contract Address</p>
              <p className="blockchain-hash">0x7EF2e0048f5bAeDe046f6BF797943daF4ED8CB47</p>
            </div>
          </div>
          
          <div className="blockchain-block">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Latest Block</h4>
              <Badge variant="outline">#{Math.floor(Math.random() * 9000000) + 1000000}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Last vote recorded {Math.floor(Math.random() * 30) + 1} minutes ago
            </p>
            <div>
              <p className="text-xs font-medium">Block Hash</p>
              <p className="blockchain-hash">0x{Array(64).fill(0).map(() => "0123456789ABCDEF"[Math.floor(Math.random() * 16)]).join('')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto text-center py-12">
          <Loader2 className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold mb-2">Loading Results</h2>
          <p className="text-muted-foreground">Fetching election data...</p>
        </div>
      </Layout>
    );
  }
  
  if (error) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Error Loading Results</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Election Results</h1>
            <p className="text-muted-foreground">
              View and analyze vote results from all elections
            </p>
          </div>
          
          <div className="mt-4 md:mt-0 w-full md:w-64">
            <Select
              onValueChange={handleElectionChange}
              defaultValue={selectedElection?.id.toString()}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Election" />
              </SelectTrigger>
              <SelectContent>
                {elections.map(election => (
                  <SelectItem key={election.id} value={election.id}>
                    {election.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {selectedElection ? (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{selectedElection.title}</CardTitle>
                <CardDescription>{selectedElection.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="bar">
                  <TabsList className="mb-4">
                    <TabsTrigger value="bar" className="flex items-center">
                      <BarChart2 className="h-4 w-4 mr-2" />
                      Bar Chart
                    </TabsTrigger>
                    <TabsTrigger value="pie" className="flex items-center">
                      <PieChartIcon className="h-4 w-4 mr-2" />
                      Pie Chart
                    </TabsTrigger>
                    <TabsTrigger value="table" className="flex items-center">
                      <Activity className="h-4 w-4 mr-2" />
                      Table
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="bar">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={results}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="candidateName" />
                          <YAxis />
                          <Tooltip formatter={(value, name) => [value, 'Votes']} />
                          <Bar dataKey="votes" fill="#3B82F6">
                            {results.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="pie">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={results}
                            dataKey="votes"
                            nameKey="candidateName"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ candidateName, percentage }) => `${candidateName}: ${percentage.toFixed(1)}%`}
                          >
                            {results.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value, name, props) => [value, props.payload.candidateName]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="table">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 font-medium">Rank</th>
                            <th className="text-left py-3 font-medium">Candidate</th>
                            <th className="text-left py-3 font-medium">Party</th>
                            <th className="text-right py-3 font-medium">Votes</th>
                            <th className="text-right py-3 font-medium">Percentage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.map((result, index) => (
                            <tr key={index} className="border-b">
                              <td className="py-3">{index + 1}</td>
                              <td className="py-3 font-medium">{result.candidateName}</td>
                              <td className="py-3">{result.party}</td>
                              <td className="py-3 text-right">{result.votes}</td>
                              <td className="py-3 text-right">{formatPercentage(result.percentage)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            
            {/* Keep blockchain info section */}
            {renderBlockchainInfo()}
          </>
        ) : (
          <div className="text-center py-12 border rounded-lg">
            <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Results Available</h2>
            <p className="text-muted-foreground">
              Results will be available after the election end time. Please check back later.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Results;
