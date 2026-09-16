import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart2, PieChart as PieChartIcon, Activity, Loader2, Calendar } from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";

const COLORS = ["#3B82F6", "#6366F1", "#8B5CF6", "#D946EF", "#14B8A6", "#F97316", "#F43F5E"];

interface ElectionResult {
  candidateName: string;
  party: string;
  votes: number;
  percentage: number;
}

interface Candidate {
  id: string;
  name: string;
  party: string;
  voteCount: number;
}

interface Election {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  results_access_offset_minutes?: number | null;
  results_published?: boolean | null;
  results_published_at?: string | null;
  candidates: Candidate[];
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function resultsAvailableAt(election: Election): Date {
  const end = new Date(election.end_date);
  const offset = election.results_access_offset_minutes ?? 0;
  return new Date(end.getTime() + offset * 60 * 1000);
}

const Results = () => {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [results, setResults] = useState<ElectionResult[]>([]);
  const [loading, setLoading] = useState(true);

  const processResults = (election: Election) => {
    const totalVotes = election.candidates.reduce((sum, c) => sum + (c.voteCount || 0), 0);
    const processed: ElectionResult[] = election.candidates.map((c) => ({
      candidateName: c.name,
      party: c.party || "Independent",
      votes: c.voteCount || 0,
      percentage: totalVotes > 0 ? Math.round(((c.voteCount || 0) / totalVotes) * 1000) / 10 : 0,
    }));
    processed.sort((a, b) => b.votes - a.votes);
    setResults(processed);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let rows: Record<string, unknown>[] | null = null;

        const full = await supabase
          .from("elections")
          .select(
            "id, title, description, start_date, end_date, results_access_offset_minutes, results_published, results_published_at"
          )
          .order("end_date", { ascending: false });

        if (!full.error) {
          rows = full.data as Record<string, unknown>[] | null;
        } else {
          const basic = await supabase
            .from("elections")
            .select("id, title, description, start_date, end_date")
            .order("end_date", { ascending: false });
          rows = (basic.data as Record<string, unknown>[] | null) ?? [];
        }

        const mapped: Election[] = (rows ?? []).map((row) => ({
          id: String(row.id),
          title: String(row.title ?? ""),
          description: (row.description as string) ?? "",
          start_date: String(row.start_date),
          end_date: String(row.end_date),
          results_access_offset_minutes: (row.results_access_offset_minutes as number) ?? 0,
          results_published: Boolean(row.results_published),
          results_published_at: (row.results_published_at as string) ?? null,
          candidates: [],
        }));

        const withCandidates = await Promise.all(
          mapped.map(async (election) => {
            if (!election.results_published) return election;
            const { data: cands } = await supabase
              .from("candidates")
              .select("id, name, party")
              .eq("election_id", election.id);

            const candidates: Candidate[] = await Promise.all(
              (cands ?? []).map(async (c) => {
                const { count } = await supabase
                  .from("votes")
                  .select("*", { count: "exact", head: true })
                  .eq("candidate_id", c.id);
                return {
                  id: c.id,
                  name: c.name,
                  party: c.party,
                  voteCount: count || 0,
                };
              })
            );
            return { ...election, candidates };
          })
        );

        setElections(withCandidates);
        if (withCandidates.length > 0) {
          setSelectedElection(withCandidates[0]);
          processResults(withCandidates[0]);
        }
      } catch (err) {
        console.error("Error loading elections:", err);
        setElections([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleElectionChange = (electionId: string) => {
    const election = elections.find((e) => e.id === electionId);
    if (election) {
      setSelectedElection(election);
      processResults(election);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto text-center py-12">
          <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold mb-2">Loading results</h2>
          <p className="text-muted-foreground">Fetching election schedule…</p>
        </div>
      </Layout>
    );
  }

  if (elections.length === 0) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto text-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No elections yet</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            When an administrator creates an election, the result day and voting dates will appear here.
          </p>
        </div>
      </Layout>
    );
  }

  const selected = selectedElection;
  const resultDay = selected ? resultsAvailableAt(selected) : null;
  const now = new Date();
  const isPublished = Boolean(selected?.results_published);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold">Election Results</h1>
            <p className="text-muted-foreground">Result day and official tallies after the admin publishes them</p>
          </div>

          <div className="w-full md:w-64">
            <Select value={selected?.id} onValueChange={handleElectionChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select Election" />
              </SelectTrigger>
              <SelectContent>
                {elections.map((election) => (
                  <SelectItem key={election.id} value={election.id}>
                    {election.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selected && resultDay && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle>{selected.title}</CardTitle>
                {isPublished ? (
                  <Badge>Published</Badge>
                ) : now >= resultDay ? (
                  <Badge variant="secondary">Awaiting admin release</Badge>
                ) : (
                  <Badge variant="outline">Scheduled</Badge>
                )}
              </div>
              {selected.description && <CardDescription>{selected.description}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border p-3">
                  <p className="text-muted-foreground">Voting starts</p>
                  <p className="font-medium mt-1">{formatWhen(selected.start_date)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-muted-foreground">Voting ends</p>
                  <p className="font-medium mt-1">{formatWhen(selected.end_date)}</p>
                </div>
                <div className="rounded-md border p-3 sm:col-span-2">
                  <p className="text-muted-foreground">Result day</p>
                  <p className="font-medium mt-1">{formatWhen(resultDay.toISOString())}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isPublished
                      ? `Released ${selected.results_published_at ? formatWhen(selected.results_published_at) : "by the administrator"}.`
                      : now >= resultDay
                        ? "The result window has opened. Tallies appear after the administrator publishes them."
                        : "Tallies stay hidden until this time and the administrator publishes results."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {selected && isPublished && (
          <Card>
            <CardHeader>
              <CardTitle>Official tally</CardTitle>
              <CardDescription>Vote counts for this election</CardDescription>
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <p className="text-sm text-muted-foreground">No votes recorded yet.</p>
              ) : (
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

                  <TabsContent value="bar" className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={results}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="candidateName" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="votes" fill="#3B82F6" name="Votes" />
                      </BarChart>
                    </ResponsiveContainer>
                  </TabsContent>

                  <TabsContent value="pie" className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={results}
                          dataKey="votes"
                          nameKey="candidateName"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ candidateName, percentage }) => `${candidateName}: ${percentage}%`}
                        >
                          {results.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </TabsContent>

                  <TabsContent value="table">
                    <div className="rounded-md border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-3">Candidate</th>
                            <th className="text-left p-3">Party</th>
                            <th className="text-right p-3">Votes</th>
                            <th className="text-right p-3">Share</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.map((row) => (
                            <tr key={row.candidateName} className="border-t">
                              <td className="p-3 font-medium">{row.candidateName}</td>
                              <td className="p-3 text-muted-foreground">{row.party}</td>
                              <td className="p-3 text-right">{row.votes}</td>
                              <td className="p-3 text-right">{row.percentage}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Results;
