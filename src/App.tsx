import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import JoinElection from "./pages/JoinElection";
import SessionVote from "./pages/SessionVote";
import Results from "./pages/Results";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Voters: join with access code (no login) */}
            <Route path="/" element={<JoinElection />} />
            <Route path="/join" element={<Navigate to="/" replace />} />
            <Route path="/session-vote" element={<SessionVote />} />
            <Route path="/results" element={<Results />} />
            <Route path="/home" element={<Index />} />

            {/* Admin only */}
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              }
            />

            {/* Legacy voter login/register routes removed from primary flow */}
            <Route path="/vote" element={<Navigate to="/" replace />} />
            <Route path="/registration" element={<Navigate to="/" replace />} />
            <Route path="/profile" element={<Navigate to="/" replace />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
