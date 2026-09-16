import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, KeyRound, BarChart, Settings, LogOut, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { signOut, user } = useAuth();

  const navItems = [
    { name: 'Join', path: '/', icon: KeyRound },
    { name: 'Results', path: '/results', icon: BarChart },
    { name: 'About', path: '/home', icon: Info },
  ];

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
          <Link to="/" className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">SecureVote Chain</span>
          </Link>
          <nav className="hidden md:flex space-x-6 items-center">
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
            {user ? (
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            ) : null}
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>

      <footer className="border-t bg-white py-6">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} SecureVote Chain — join with election access code</p>
        </div>
      </footer>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50">
        <div className={cn("grid", navItems.length >= 4 ? "grid-cols-4" : "grid-cols-3")}>
          {navItems.map((item) => (
            <Link
              key={item.name + item.path}
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
