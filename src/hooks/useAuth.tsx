import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid api key') || m.includes('jwt')) {
    return 'Invalid Supabase API key. In .env use the anon public key from Project Settings → API (usually starts with eyJ).';
  }
  if (m.includes('email not confirmed')) {
    return 'Email not confirmed. In Supabase: Authentication → Providers → Email → turn OFF "Confirm email", then try again.';
  }
  if (m.includes('invalid login credentials')) {
    return 'Wrong email or password, or the account does not exist yet. Use Sign Up first.';
  }
  if (m.includes('user already registered')) {
    return 'This email is already registered. Use Login instead.';
  }
  if (m.includes('database error')) {
    return 'Database error during signup. Run APPLY_FIX_AUTH_PROFILE.sql in the Supabase SQL Editor, then try again.';
  }
  if (m.includes('failed to fetch') || m.includes('network')) {
    return 'Cannot reach Supabase. Check your internet connection and VITE_SUPABASE_URL in .env.';
  }
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      toast({
        title: 'Signed in',
        description: 'Welcome back.',
      });
    } catch (error) {
      const raw = error instanceof Error ? error.message : 'Login failed';
      toast({
        title: 'Login Failed',
        description: friendlyAuthError(raw),
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error) throw error;

      // If email confirmation is disabled, session is returned immediately
      if (data.session) {
        toast({
          title: 'Account created',
          description: 'You are signed in. Opening admin…',
        });
        return;
      }

      // Confirmation required — try login anyway (works if confirm is off / already confirmed)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        toast({
          title: 'Sign up almost done',
          description:
            'Account created, but email confirmation may be required. Disable "Confirm email" in Supabase Auth settings, or confirm via email, then Login.',
        });
        return;
      }

      toast({
        title: 'Account created',
        description: 'You are signed in.',
      });
    } catch (error) {
      const raw = error instanceof Error ? error.message : 'Registration failed';
      toast({
        title: 'Registration Failed',
        description: friendlyAuthError(raw),
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: 'Sign Out Failed',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        signIn,
        signUp,
        signOut,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
