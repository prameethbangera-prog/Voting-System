
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Users,
  Vote,
  BarChart3,
  Activity,
  Settings,
  Trash2,
  PenSquare,
  Eye,
  Loader2,
  Calendar,
  Clock
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [elections, setElections] = useState<any[]>([]);
  const [votes, setVotes] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  // Add state for selected election and candidates
  const [selectedElection, setSelectedElection] = useState<any | null>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [viewElectionDialog, setViewElectionDialog] = useState<any | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch users from multiple sources to ensure we get all users
        // 1. Fetch from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, created_at, avatar_url');
        
        // 2. Fetch users who have voted (they might not have profiles yet)
        const { data: voterData, error: voterError } = await supabase
          .from('votes')
          .select('voter_id, created_at')
          .order('created_at', { ascending: false });
        
        // Combine users from both sources
        const userMap = new Map<string, any>();
        
        // Add users from profiles
        if (profileData) {
          profileData.forEach(profile => {
            userMap.set(profile.id, {
              id: profile.id,
              full_name: profile.full_name,
              created_at: profile.created_at,
              avatar_url: profile.avatar_url
            });
          });
        }
        
        // Add users from votes (if they don't already exist)
        if (voterData) {
          voterData.forEach(vote => {
            if (!userMap.has(vote.voter_id)) {
              userMap.set(vote.voter_id, {
                id: vote.voter_id,
                full_name: null,
                created_at: vote.created_at,
                avatar_url: null
              });
            }
          });
        }
        
        // Convert map to array
        let userData = Array.from(userMap.values());
        
        // If no users found, try to create profiles for users who have voted
        if (userData.length === 0 && voterData && voterData.length > 0) {
          // Create profiles for users who voted but don't have profiles
          const uniqueVoterIds = [...new Set(voterData.map(v => v.voter_id))];
          for (const voterId of uniqueVoterIds) {
            try {
              await supabase
                .from('profiles')
                .upsert({
                  id: voterId,
                  full_name: null,
                  created_at: new Date().toISOString()
                }, { onConflict: 'id' });
            } catch (err) {
              console.warn('Error creating profile for user:', voterId, err);
            }
          }
          // Refetch profiles
          const { data: newProfileData } = await supabase
            .from('profiles')
            .select('id, full_name, created_at, avatar_url');
          userData = newProfileData || [];
        }
        
        // Fetch biometric data to determine which users have registered
        const { data: biometricData, error: bioError } = await supabase
          .from('user_biometrics')
          .select('user_id');
        
        if (bioError) {
          console.warn('Error fetching biometrics:', bioError);
        }
        
        // Map biometric data to users
        const bioIds = (biometricData || []).map(bio => bio.user_id);
        const usersWithBioStatus = userData.map(user => ({
          ...user,
          has_biometrics: bioIds.includes(user.id)
        }));
        
        setUsers(usersWithBioStatus);
        
        // Fetch elections
        const { data: electionData, error: electionError } = await supabase
          .from('elections')
          .select('*')
          .order('start_date', { ascending: false });
        
        if (electionError) throw electionError;
        setElections(electionData);
        
        // Fetch votes
        const { data: voteData, error: voteError } = await supabase
          .from('votes')
          .select(`
            id, 
            created_at,
            voter_id,
            elections!inner(id, title),
            candidates!inner(id, name)
          `)
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (voteError) throw voteError;
        setVotes(voteData);
        
        // Create simulated activity log
        const activities = [
          { id: 1, type: 'login', user_id: 'admin', details: 'Admin logged in', timestamp: new Date().toISOString() },
          { id: 2, type: 'user_register', user_id: 'user123', details: 'New user registered', timestamp: new Date(Date.now() - 60000).toISOString() },
          { id: 3, type: 'face_register', user_id: 'user456', details: 'Face biometric registered', timestamp: new Date(Date.now() - 120000).toISOString() },
          { id: 4, type: 'vote_cast', user_id: 'user789', details: 'Vote cast in Presidential Election', timestamp: new Date(Date.now() - 180000).toISOString() },
          { id: 5, type: 'system', details: 'Daily backup completed', timestamp: new Date(Date.now() - 240000).toISOString() }
        ];
        setActivities(activities);
        
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load admin dashboard data.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDeleteUser = async (userId: string) => {
    try {
      // In a real app, you would likely want to use an Edge Function for this
      // to properly handle the auth user deletion as well
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      if (error) throw error;
      
      setUsers(users.filter(user => user.id !== userId));
      
      toast({
        title: 'Success',
        description: 'User deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete user.',
        variant: 'destructive',
      });
    }
  };

  const handleResetFaceData = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_biometrics')
        .delete()
        .eq('user_id', userId);
      
      if (error) throw error;
      
      // Update the local state
      setUsers(users.map(u => 
        u.id === userId ? { ...u, has_biometrics: false } : u
      ));
      
      toast({
        title: 'Success',
        description: 'Biometric data reset successfully.',
      });
    } catch (error) {
      console.error('Error resetting biometric data:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset biometric data.',
        variant: 'destructive',
      });
    }
  };

  const handleViewElection = async (election: any) => {
    // Fetch candidates for this election
    await fetchCandidates(election.id);
    setViewElectionDialog(election);
  };

  const handleEditElection = (election: any) => {
    // Navigate to Admin page with election pre-selected for editing
    navigate('/admin', { 
      state: { 
        electionId: election.id,
        tab: 'edit'
      } 
    });
  };

  const handleDeleteElection = async (electionId: string, electionTitle: string) => {
    try {
      // Delete the election (candidates will be deleted automatically due to CASCADE)
      const { error } = await supabase
        .from('elections')
        .delete()
        .eq('id', electionId);
      
      if (error) throw error;
      
      // Remove from local state
      setElections(elections.filter(e => e.id !== electionId));
      
      toast({
        title: 'Success',
        description: `Election "${electionTitle}" has been deleted successfully.`,
      });
    } catch (error) {
      console.error('Error deleting election:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete the election. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Add fetchCandidates function
  const fetchCandidates = async (electionId: string) => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('election_id', electionId);
        
      if (error) throw error;
      
      setCandidates(data || []);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      toast({
        title: "Error",
        description: "Failed to load candidates data.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveCandidate = async (candidateId: string) => {
    try {
      console.log(`Removing candidate with ID: ${candidateId}`);
      
      // Delete the candidate from the database
      const { error } = await supabase
        .from('candidates')
        .delete()
        .eq('id', String(candidateId));
        
      if (error) {
        console.error('Error during candidate removal:', error);
        throw error;
      }
      
      toast({
        title: "Candidate Removed",
        description: "The candidate has been successfully removed from the election.",
      });
      
      // Update candidates list if selectedElection is available
      if (selectedElection) {
        fetchCandidates(selectedElection.id);
      }
      
    } catch (error) {
      console.error("Error removing candidate:", error);
      toast({
        title: "Error",
        description: "Failed to remove the candidate. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="users">
            <TabsList className="grid grid-cols-4 mb-8">
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="elections" className="flex items-center gap-2">
                <Vote className="h-4 w-4" />
                <span className="hidden sm:inline">Elections</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Analytics</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Activity Log</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">User Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Registration Date</TableHead>
                          <TableHead>Biometrics</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center">No users found</TableCell>
                          </TableRow>
                        ) : (
                          users.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-mono text-xs">{user.id.substring(0, 8)}...</TableCell>
                              <TableCell>{user.full_name || 'N/A'}</TableCell>
                              <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                              <TableCell>
                                {user.has_biometrics ? 
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Registered
                                  </span> : 
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Not Registered
                                  </span>
                                }
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete User</span>
                                  </Button>
                                  {user.has_biometrics && (
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => handleResetFaceData(user.id)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <PenSquare className="h-4 w-4" />
                                      <span className="sr-only">Reset Biometrics</span>
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="elections">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Elections Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>End Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {elections.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center">No elections found</TableCell>
                          </TableRow>
                        ) : (
                          elections.map((election) => (
                            <TableRow key={election.id}>
                              <TableCell>{election.title}</TableCell>
                              <TableCell>{new Date(election.start_date).toLocaleDateString()}</TableCell>
                              <TableCell>{new Date(election.end_date).toLocaleDateString()}</TableCell>
                              <TableCell>
                                {election.is_active ? 
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Active
                                  </span> : 
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    Inactive
                                  </span>
                                }
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Dialog open={viewElectionDialog?.id === election.id} onOpenChange={(open) => !open && setViewElectionDialog(null)}>
                                    <DialogTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() => handleViewElection(election)}
                                      >
                                        <Eye className="h-4 w-4" />
                                        <span className="sr-only">View Election</span>
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                      <DialogHeader>
                                        <DialogTitle>{viewElectionDialog?.title}</DialogTitle>
                                        <DialogDescription>
                                          {viewElectionDialog?.description || 'No description provided'}
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4 mt-4">
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="flex items-center space-x-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                              <p className="text-sm font-medium">Start Date</p>
                                              <p className="text-sm text-muted-foreground">
                                                {viewElectionDialog && new Date(viewElectionDialog.start_date).toLocaleString()}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                              <p className="text-sm font-medium">End Date</p>
                                              <p className="text-sm text-muted-foreground">
                                                {viewElectionDialog && new Date(viewElectionDialog.end_date).toLocaleString()}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <Badge variant={viewElectionDialog?.is_active ? "default" : "secondary"}>
                                            {viewElectionDialog?.is_active ? "Active" : "Inactive"}
                                          </Badge>
                                          {viewElectionDialog?.results_access_offset_minutes !== undefined && (
                                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                              <Clock className="h-4 w-4" />
                                              <span>
                                                Results available {
                                                  viewElectionDialog.results_access_offset_minutes < 0 
                                                    ? `${Math.abs(viewElectionDialog.results_access_offset_minutes)} minutes before`
                                                    : viewElectionDialog.results_access_offset_minutes > 0
                                                    ? `${viewElectionDialog.results_access_offset_minutes} minutes after`
                                                    : 'immediately after'
                                                } end time
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium mb-2">Candidates</p>
                                          {viewElectionDialog && (() => {
                                            const electionCandidates = candidates.filter(c => c.election_id === viewElectionDialog.id);
                                            return electionCandidates.length > 0 ? (
                                              <ul className="list-disc list-inside space-y-1">
                                                {electionCandidates.map((candidate: any) => (
                                                  <li key={candidate.id} className="text-sm">
                                                    {candidate.name} {candidate.party && `(${candidate.party})`}
                                                  </li>
                                                ))}
                                              </ul>
                                            ) : (
                                              <p className="text-sm text-muted-foreground">No candidates added yet</p>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleEditElection(election)}
                                  >
                                    <PenSquare className="h-4 w-4" />
                                    <span className="sr-only">Edit Election</span>
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Delete Election</span>
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Election</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete "{election.title}"? This action cannot be undone. 
                                          All associated candidates and votes will also be deleted.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteElection(election.id, election.title)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">System Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Registered Users</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{users.length}</div>
                        <div className="text-sm text-muted-foreground">
                          {users.filter(u => u.has_biometrics).length} with biometrics
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Active Elections</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {elections.filter(e => e.is_active).length}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {elections.length} total elections
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Total Votes Cast</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{votes.length}</div>
                        <div className="text-sm text-muted-foreground">
                          Across all elections
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">System Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center">
                          <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                          <div className="text-sm font-medium">Operational</div>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Last updated: {new Date().toLocaleTimeString()}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">System Activity Log</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead>User ID</TableHead>
                          <TableHead>Timestamp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activities.map((activity) => (
                          <TableRow key={activity.id}>
                            <TableCell>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                ${activity.type === 'login' ? 'bg-blue-100 text-blue-800' : ''}
                                ${activity.type === 'user_register' ? 'bg-green-100 text-green-800' : ''}
                                ${activity.type === 'face_register' ? 'bg-purple-100 text-purple-800' : ''}
                                ${activity.type === 'vote_cast' ? 'bg-amber-100 text-amber-800' : ''}
                                ${activity.type === 'system' ? 'bg-gray-100 text-gray-800' : ''}
                              `}>
                                {activity.type}
                              </span>
                            </TableCell>
                            <TableCell>{activity.details}</TableCell>
                            <TableCell>{activity.user_id}</TableCell>
                            <TableCell>{new Date(activity.timestamp).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
