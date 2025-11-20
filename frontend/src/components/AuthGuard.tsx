import React, { useEffect, useState } from 'react';
import { hasValidSession, logoutWithReason, getUser } from '../lib/auth';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectOnFail?: boolean;
}

// Simple wrapper that checks session once on mount and (optionally) periodically.
export const AuthGuard: React.FC<AuthGuardProps> = ({ children, fallback = null, redirectOnFail = true }) => {
  const [allowed, setAllowed] = useState<boolean>(hasValidSession());

  useEffect(() => {
    if (!hasValidSession()) {
      if (redirectOnFail) {
        logoutWithReason('expired');
      } else {
        setAllowed(false);
      }
      return;
    }
    setAllowed(true);
    // Periodic check every 60s
    const id = setInterval(() => {
      if (!hasValidSession()) {
        logoutWithReason('expired');
      }
    }, 60000);
    return () => clearInterval(id);
  }, []);

  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
};
