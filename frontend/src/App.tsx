import { useState, useEffect } from 'react';
import { logout } from './lib/auth';
import { userApi } from './lib/api';
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
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch { localStorage.removeItem('user'); }
    }
  }, []);

  const handleLogin = (userData: any) => {
    setUser(userData);
  };

  const handleRegister = (userData: any) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    // Attempt server-side invalidation before clearing local session.
    try {
      await userApi.logout();
    } catch {
      // Ignore errors; proceed with local logout.
    }
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    setUser(null);
    setCurrentPage('login');
    logout();
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
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} onLogout={handleLogout} />
      {user.role === 'driver' ? (
        <DriverDashboard user={user} />
      ) : (
        <RiderDashboard user={user} />
      )}
      <Toaster position="top-right" richColors />
    </div>
  );
}
