
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Vote from "./pages/Vote";
import Registration from "./pages/Registration";
import Results from "./pages/Results";
import Profile from "./pages/Profile";
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
            {/* Set the Auth page as the landing page */}
            <Route path="/" element={<Auth />} />
            {/* Home page with project information */}
            <Route path="/home" element={<Index />} />
            {/* Registration page, accessible to everyone */}
            <Route path="/registration" element={<Registration />} />
            {/* Authentication page */}
            <Route path="/auth" element={<Auth />} />
            {/* Results page, accessible to everyone */}
            <Route path="/results" element={<Results />} />
            {/* Protected routes that require authentication */}
            <Route path="/vote" element={
              <ProtectedRoute>
                <Vote />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
