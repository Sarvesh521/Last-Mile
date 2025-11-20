import { useState, useEffect } from 'react';
import { hasValidSession, logoutWithReason } from './lib/auth';
import { AuthGuard } from './components/AuthGuard';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { DriverDashboard } from './components/DriverDashboard';
import { RiderDashboard } from './components/RiderDashboard';
import { Navbar } from './components/Navbar';
import { Toaster } from './components/ui/sonner';

type Page = 'login' | 'register';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<Page>('login');

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        localStorage.removeItem('user');
      }
    }
    // Immediate validity check
    if (!hasValidSession()) {
      localStorage.removeItem('user');
      localStorage.removeItem('auth_token');
    }
    // Periodic idle/expiry check every 60s
    const id = setInterval(() => {
      if (!hasValidSession() && user) {
        logoutWithReason('expired');
      }
    }, 60000);
    return () => clearInterval(id);
  }, []);

  const handleLogin = (userData: any) => {
    setUser(userData);
  };

  const handleRegister = (userData: any) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    setUser(null);
    setCurrentPage('login');
  };

  // Show login/register pages
  if (!user) {
    if (currentPage === 'login') {
      return (
        <>
          <Login
            onLogin={handleLogin}
            onSwitchToRegister={() => setCurrentPage('register')}
          />
          <Toaster position="top-right" richColors />
        </>
      );
    }
    
    return (
      <>
        <Register
          onRegister={handleRegister}
          onSwitchToLogin={() => setCurrentPage('login')}
        />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  // Show appropriate dashboard based on user role
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} onLogout={handleLogout} />
        {user.role === 'driver' ? (
          <DriverDashboard user={user} />
        ) : (
          <RiderDashboard user={user} />
        )}
        <Toaster position="top-right" richColors />
      </div>
    </AuthGuard>
  );
}
