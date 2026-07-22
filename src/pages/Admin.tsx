import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertCircle, Loader2, Lock, UserPlus, Calendar, Check, Users, Vote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import FaceRecognition from '@/components/FaceRecognition';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Election {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface Candidate {
  id: string;
  name: string;
  party: string;
  bio: string;
  election_id: string;
}

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isBiometricsVerified, setIsBiometricsVerified] = useState<boolean>(false);
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("create");
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoadingElections, setIsLoadingElections] = useState<boolean>(false);
  
  // Form states for creating/editing elections
  const [electionTitle, setElectionTitle] = useState<string>("");
  const [electionDescription, setElectionDescription] = useState<string>("");
  const [electionStartDate, setElectionStartDate] = useState<string>("");
  const [electionStartTime, setElectionStartTime] = useState<string>("");
  const [electionEndDate, setElectionEndDate] = useState<string>("");
  const [electionEndTime, setElectionEndTime] = useState<string>("");
  const [resultsAccessOffset, setResultsAccessOffset] = useState<string>("0"); // Minutes offset (can be negative)
  const [resultsAccessType, setResultsAccessType] = useState<"before" | "after">("after");
  const [isActive, setIsActive] = useState<boolean>(true);
  
  // Form states for adding candidates
  const [candidateName, setCandidateName] = useState<string>("");
  const [candidateParty, setCandidateParty] = useState<string>("");
  const [candidateBio, setCandidateBio] = useState<string>("");

  // Check if user is an admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      
      try {
        // Check if email ends with admin.com or is in the admin list
        const isUserAdmin = user.email?.endsWith('@chiraj.com') || false;
        setIsAdmin(isUserAdmin);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Fetch elections
  useEffect(() => {
    if (isBiometricsVerified) {
      fetchElections();
    }
  }, [isBiometricsVerified]);

  // Handle navigation state from AdminDashboard (for editing election)
  useEffect(() => {
    if (location.state && (location.state as any).electionId && isBiometricsVerified && elections.length > 0) {
      const electionId = (location.state as any).electionId;
      const tab = (location.state as any).tab || 'edit';
      
      const election = elections.find(e => e.id === electionId);
      if (election) {
        handleElectionSelect(electionId);
        setActiveTab(tab);
        // Clear navigation state
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, isBiometricsVerified, elections, navigate]);

  // Fetch candidates when an election is selected
  useEffect(() => {
    if (selectedElection) {
      fetchCandidates(selectedElection.id);
    }
  }, [selectedElection]);

  const fetchElections = async () => {
    setIsLoadingElections(true);
    try {
      const { data, error } = await supabase
        .from('elections')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setElections(data || []);
    } catch (error) {
      console.error("Error fetching elections:", error);
      toast({
        title: "Error",
        description: "Failed to load elections data.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingElections(false);
    }
  };

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

  const handleElectionSelect = (electionId: string) => {
    const election = elections.find(e => e.id === electionId);
    if (election) {
      setSelectedElection(election);
      setElectionTitle(election.title);
      setElectionDescription(election.description || "");
      
      // Parse start date and time
      const startDate = new Date(election.start_date);
      setElectionStartDate(startDate.toISOString().split('T')[0]);
      setElectionStartTime(startDate.toTimeString().slice(0, 5)); // HH:mm format
      
      // Parse end date and time
      const endDate = new Date(election.end_date);
      setElectionEndDate(endDate.toISOString().split('T')[0]);
      setElectionEndTime(endDate.toTimeString().slice(0, 5)); // HH:mm format
      
      // Parse results access offset if it exists
      if ((election as any).results_access_offset_minutes !== undefined) {
        const offset = (election as any).results_access_offset_minutes;
        if (offset < 0) {
          setResultsAccessOffset(Math.abs(offset).toString());
          setResultsAccessType("before");
        } else {
          setResultsAccessOffset(offset.toString());
          setResultsAccessType("after");
        }
      } else {
        setResultsAccessOffset("0");
        setResultsAccessType("after");
      }
      
      setIsActive(election.is_active);
      setActiveTab("edit");
    }
  };

  const handleCreateElection = async () => {
    if (!electionTitle || !electionStartDate || !electionEndDate || !electionStartTime || !electionEndTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields including dates and times.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Combine date and time for start_date
      const startDateTime = new Date(`${electionStartDate}T${electionStartTime}`);
      
      // Combine date and time for end_date
      const endDateTime = new Date(`${electionEndDate}T${electionEndTime}`);
      
      // Calculate results access offset in minutes
      const offsetMinutes = parseInt(resultsAccessOffset) || 0;
      const resultsAccessOffsetMinutes = resultsAccessType === "before" ? -offsetMinutes : offsetMinutes;
      
      const { data, error } = await supabase
        .from('elections')
        .insert([{
          title: electionTitle,
          description: electionDescription,
          start_date: startDateTime.toISOString(),
          end_date: endDateTime.toISOString(),
          results_access_offset_minutes: resultsAccessOffsetMinutes,
          is_active: isActive,
          created_by: user?.id
        }])
        .select();
        
      if (error) throw error;
      
      toast({
        title: "Election Created",
        description: "The election has been successfully created.",
      });
      
      // Reset form fields
      setElectionTitle("");
      setElectionDescription("");
      setElectionStartDate("");
      setElectionStartTime("");
      setElectionEndDate("");
      setElectionEndTime("");
      setResultsAccessOffset("0");
      setResultsAccessType("after");
      
      // Update elections list
      fetchElections();
      
      // If the created election has data, select it for adding candidates
      if (data && data.length > 0) {
        setSelectedElection(data[0]);
        setActiveTab("candidates");
      }
      
    } catch (error) {
      console.error("Error creating election:", error);
      toast({
        title: "Error",
        description: "Failed to create the election. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateElection = async () => {
    if (!selectedElection || !electionTitle || !electionStartDate || !electionEndDate || !electionStartTime || !electionEndTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields including dates and times.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Combine date and time for start_date
      const startDateTime = new Date(`${electionStartDate}T${electionStartTime}`);
      
      // Combine date and time for end_date
      const endDateTime = new Date(`${electionEndDate}T${electionEndTime}`);
      
      // Calculate results access offset in minutes
      const offsetMinutes = parseInt(resultsAccessOffset) || 0;
      const resultsAccessOffsetMinutes = resultsAccessType === "before" ? -offsetMinutes : offsetMinutes;
      
      const { error } = await supabase
        .from('elections')
        .update({
          title: electionTitle,
          description: electionDescription,
          start_date: startDateTime.toISOString(),
          end_date: endDateTime.toISOString(),
          results_access_offset_minutes: resultsAccessOffsetMinutes,
          is_active: isActive
        })
        .eq('id', selectedElection.id);
        
      if (error) throw error;
      
      toast({
        title: "Election Updated",
        description: "The election details have been successfully updated.",
      });
      
      // Update elections list
      fetchElections();
      
    } catch (error) {
      console.error("Error updating election:", error);
      toast({
        title: "Error",
        description: "Failed to update the election. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddCandidate = async () => {
    if (!selectedElection || !candidateName || !candidateParty) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields for the candidate.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('candidates')
        .insert([{
          name: candidateName,
          party: candidateParty,
          bio: candidateBio,
          election_id: selectedElection.id
        }]);
        
      if (error) throw error;
      
      toast({
        title: "Candidate Added",
        description: "The candidate has been successfully added to the election.",
      });
      
      // Reset form fields
      setCandidateName("");
      setCandidateParty("");
      setCandidateBio("");
      
      // Update candidates list
      fetchCandidates(selectedElection.id);
      
    } catch (error) {
      console.error("Error adding candidate:", error);
      toast({
        title: "Error",
        description: "Failed to add the candidate. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveCandidate = async (candidateId: string) => {
    try {
      // Delete the candidate from the database
      const { error } = await supabase
        .from('candidates')
        .delete()
        .eq('id', String(candidateId));
        
      if (error) throw error;
      
      toast({
        title: "Candidate Removed",
        description: "The candidate has been successfully removed from the election.",
      });
      
      // Update candidates list
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

  const handleFaceVerificationSuccess = () => {
    setIsBiometricsVerified(true);
  };

  const handleAdminPasswordLogin = () => {
    // In a real application, this would be a more secure comparison
    // For demo purposes, we're using a simple password check
    if (adminPassword === "Chiraj@123") {
      setIsAdmin(true);
      toast({
        title: "Admin Access Granted",
        description: "You have successfully logged in as an administrator.",
      });
    } else {
      toast({
        title: "Access Denied",
        description: "Incorrect admin password.",
        variant: "destructive",
      });
    }
  };

  if (isAdmin === null) {
    return (
      <Layout>
        <div className="container mx-auto py-8 flex justify-center items-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <CardTitle>Admin Authentication</CardTitle>
              </div>
              <CardDescription>
                Please enter the admin password to access the admin dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <Input 
                  type="password" 
                  placeholder="Enter admin password" 
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleAdminPasswordLogin} className="flex-1">
                  Login as Admin
                </Button>
                <Button onClick={() => navigate('/')} variant="outline" className="flex-1">
                  Return to Home
                </Button>
              </div>
             
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8">
        {!isBiometricsVerified ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <CardTitle>Admin Authentication Required</CardTitle>
              </div>
              <CardDescription>
                Please complete biometric verification to access the admin dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FaceRecognition onVerified={handleFaceVerificationSuccess} />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">Election Management System</h1>
              <Button variant="outline" onClick={() => fetchElections()} disabled={isLoadingElections}>
                {isLoadingElections ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
              </Button>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="create">Create Election</TabsTrigger>
                <TabsTrigger value="edit">Edit Election</TabsTrigger>
                <TabsTrigger value="candidates">Manage Candidates</TabsTrigger>
              </TabsList>
              
              <TabsContent value="create">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Vote className="h-6 w-6 text-primary" />
                      <CardTitle>Create New Election</CardTitle>
                    </div>
                    <CardDescription>
                      Fill in the details to create a new election.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="title">Election Title*</Label>
                      <Input
                        id="title"
                        placeholder="e.g., Presidential Election 2025"
                        value={electionTitle}
                        onChange={(e) => setElectionTitle(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Election Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Enter a detailed description of the election"
                        value={electionDescription}
                        onChange={(e) => setElectionDescription(e.target.value)}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startDate">Start Date*</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={electionStartDate}
                          onChange={(e) => setElectionStartDate(e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="startTime">Start Time*</Label>
                        <Input
                          id="startTime"
                          type="time"
                          value={electionStartTime}
                          onChange={(e) => setElectionStartTime(e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="endDate">End Date*</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={electionEndDate}
                          onChange={(e) => setElectionEndDate(e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="endTime">End Time*</Label>
                        <Input
                          id="endTime"
                          type="time"
                          value={electionEndTime}
                          onChange={(e) => setElectionEndTime(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="resultsAccessType">Results Access</Label>
                        <Select
                          value={resultsAccessType}
                          onValueChange={(value: "before" | "after") => setResultsAccessType(value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="before">Before End Time</SelectItem>
                            <SelectItem value="after">After End Time</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="resultsAccessOffset">Offset (minutes)*</Label>
                        <Input
                          id="resultsAccessOffset"
                          type="number"
                          min="0"
                          placeholder="e.g., 30"
                          value={resultsAccessOffset}
                          onChange={(e) => setResultsAccessOffset(e.target.value)}
                        />
                      </div>
                      
                      <div className="flex items-end">
                        <div className="text-sm text-muted-foreground pt-2">
                          {resultsAccessType === "before" 
                            ? `Results available ${resultsAccessOffset || 0} minutes before end time`
                            : `Results available ${resultsAccessOffset || 0} minutes after end time`}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <input
                        id="active"
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="h-4 w-4 text-primary rounded"
                      />
                      <Label htmlFor="active">Active</Label>
                    </div>
                    
                    <Button onClick={handleCreateElection} className="w-full">
                      Create Election
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="edit">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-6 w-6 text-primary" />
                      <CardTitle>Edit Existing Election</CardTitle>
                    </div>
                    <CardDescription>
                      Select an election from the list to edit its details.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isLoadingElections ? (
                      <div className="flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : (
                      <>
                        <div>
                          <Label htmlFor="selectElection">Select Election</Label>
                          <Select 
                            value={selectedElection?.id || ""} 
                            onValueChange={handleElectionSelect}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select an election" />
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
                        
                        {selectedElection && (
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="editTitle">Election Title*</Label>
                              <Input
                                id="editTitle"
                                value={electionTitle}
                                onChange={(e) => setElectionTitle(e.target.value)}
                              />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="editStartDate">Start Date*</Label>
                                <Input
                                  id="editStartDate"
                                  type="date"
                                  value={electionStartDate}
                                  onChange={(e) => setElectionStartDate(e.target.value)}
                                />
                              </div>
                              
                              <div>
                                <Label htmlFor="editStartTime">Start Time*</Label>
                                <Input
                                  id="editStartTime"
                                  type="time"
                                  value={electionStartTime}
                                  onChange={(e) => setElectionStartTime(e.target.value)}
                                />
                              </div>
                              
                              <div>
                                <Label htmlFor="editEndDate">End Date*</Label>
                                <Input
                                  id="editEndDate"
                                  type="date"
                                  value={electionEndDate}
                                  onChange={(e) => setElectionEndDate(e.target.value)}
                                />
                              </div>
                              
                              <div>
                                <Label htmlFor="editEndTime">End Time*</Label>
                                <Input
                                  id="editEndTime"
                                  type="time"
                                  value={electionEndTime}
                                  onChange={(e) => setElectionEndTime(e.target.value)}
                                />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <Label htmlFor="editResultsAccessType">Results Access</Label>
                                <Select
                                  value={resultsAccessType}
                                  onValueChange={(value: "before" | "after") => setResultsAccessType(value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="before">Before End Time</SelectItem>
                                    <SelectItem value="after">After End Time</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div>
                                <Label htmlFor="editResultsAccessOffset">Offset (minutes)*</Label>
                                <Input
                                  id="editResultsAccessOffset"
                                  type="number"
                                  min="0"
                                  placeholder="e.g., 30"
                                  value={resultsAccessOffset}
                                  onChange={(e) => setResultsAccessOffset(e.target.value)}
                                />
                              </div>
                              
                              <div className="flex items-end">
                                <div className="text-sm text-muted-foreground pt-2">
                                  {resultsAccessType === "before" 
                                    ? `Results available ${resultsAccessOffset || 0} minutes before end time`
                                    : `Results available ${resultsAccessOffset || 0} minutes after end time`}
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <Label htmlFor="editDescription">Election Description</Label>
                              <Textarea
                                id="editDescription"
                                value={electionDescription}
                                onChange={(e) => setElectionDescription(e.target.value)}
                              />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="editStartDate">Start Date*</Label>
                                <Input
                                  id="editStartDate"
                                  type="date"
                                  value={electionStartDate}
                                  onChange={(e) => setElectionStartDate(e.target.value)}
                                />
                              </div>
                              
                              <div>
                                <Label htmlFor="editEndDate">End Date*</Label>
                                <Input
                                  id="editEndDate"
                                  type="date"
                                  value={electionEndDate}
                                  onChange={(e) => setElectionEndDate(e.target.value)}
                                />
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <input
                                id="editActive"
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                className="h-4 w-4 text-primary rounded"
                              />
                              <Label htmlFor="editActive">Active</Label>
                            </div>
                            
                            <Button onClick={handleUpdateElection} className="w-full">
                              Update Election
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="candidates">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Users className="h-6 w-6 text-primary" />
                      <CardTitle>Manage Candidates</CardTitle>
                    </div>
                    <CardDescription>
                      Add or remove candidates for an election.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="candidateElection">Select Election</Label>
                      <Select 
                        value={selectedElection?.id || ""} 
                        onValueChange={handleElectionSelect}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an election" />
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
                    
                    {selectedElection && (
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Add New Candidate</h3>
                          
                          <div>
                            <Label htmlFor="candidateName">Candidate Name*</Label>
                            <Input
                              id="candidateName"
                              placeholder="Enter candidate name"
                              value={candidateName}
                              onChange={(e) => setCandidateName(e.target.value)}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="candidateParty">Party*</Label>
                            <Input
                              id="candidateParty"
                              placeholder="Enter political party"
                              value={candidateParty}
                              onChange={(e) => setCandidateParty(e.target.value)}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="candidateBio">Biography</Label>
                            <Textarea
                              id="candidateBio"
                              placeholder="Enter candidate biography"
                              value={candidateBio}
                              onChange={(e) => setCandidateBio(e.target.value)}
                            />
                          </div>
                          
                          <Button onClick={handleAddCandidate}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add Candidate
                          </Button>
                        </div>
                        
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Current Candidates</h3>
                          
                          {candidates.length === 0 ? (
                            <p className="text-muted-foreground">No candidates added for this election yet.</p>
                          ) : (
                            <div className="space-y-3">
                              {candidates.map(candidate => (
                                <div key={candidate.id} className="p-3 border rounded flex justify-between items-center">
                                  <div>
                                    <p className="font-medium">{candidate.name}</p>
                                    <p className="text-sm text-muted-foreground">{candidate.party}</p>
                                  </div>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="text-destructive border-destructive hover:bg-destructive/10"
                                      >
                                        Remove
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This action will permanently remove this candidate from the election.
                                          Any votes already cast for this candidate will remain in the system.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={() => handleRemoveCandidate(candidate.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Remove Candidate
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            
            <AdminDashboard />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Admin;
