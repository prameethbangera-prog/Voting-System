
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, Vote, BarChart, Users, Settings, LogOut, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { signOut, user } = useAuth();
  
  // Updated navigation items with correct order based on user flow
  const navItems = [
    { name: 'Home', path: '/home', icon: Shield },
    { name: 'Registration', path: '/registration', icon: FileText },
    { name: 'Vote', path: '/vote', icon: Vote },
    { name: 'Results', path: '/results', icon: BarChart },
    { name: 'Profile', path: '/profile', icon: Users },
  ];

  // Only show admin for certain users (in a real app, this would check roles)
  if (user) {
    navItems.push({ name: 'Admin', path: '/admin', icon: Settings });
  }

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">SecureVote Chain</span>
          </div>
          <nav className="hidden md:flex space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center space-x-1 px-2 py-1 rounded hover:bg-slate-100 transition-colors",
                  location.pathname === item.path && "text-primary font-medium"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            ))}
            {user && (
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            )}
          </nav>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto px-4 py-6">
        {children}
      </main>
      
      <footer className="border-t bg-white py-6">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          <p>© 2025 SecureVote Chain - Decentralized Voting System with Multi-Model Biometric Verification</p>
        </div>
      </footer>
      
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50">
        <div className="grid grid-cols-5">
          {navItems.slice(0, 5).map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                "flex flex-col items-center py-2 px-1",
                location.pathname === item.path && "text-primary"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs mt-1">{item.name}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
