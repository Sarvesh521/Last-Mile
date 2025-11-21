// Simple token-based auth helpers.
// Backend enforces token validity & expiry via Redis; frontend no longer tracks time.

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'rider' | 'driver';
}

const USER_KEY = 'user';
const TOKEN_KEY = 'auth_token';
// Timestamp / age tracking removed; backend is source of truth.

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function setSession(user: SessionUser, token?: string) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function hasValidSession(): boolean {
  return !!getUser() && isAuthenticated();
}

export function logout() {
  clearSession();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

// Lightweight name resolution used both by register and login flows.
export function resolveName(profileName?: string, fallbackFormName?: string): string {
  if (profileName && profileName.trim()) return profileName.trim();
  if (fallbackFormName && fallbackFormName.trim()) return fallbackFormName.trim();
  const existing = getUser()?.name;
  if (existing && existing.trim()) return existing.trim();
  return 'User';
}

// Imperative auth guard: ensures a valid session or redirects.
// Returns the current SessionUser if authenticated; otherwise redirects to login.
export function requireAuth(redirectPath: string = '/login'): SessionUser {
  if (!isAuthenticated()) {
    window.location.href = redirectPath;
    throw new Error('Redirecting to login');
  }
  const user = getUser();
  if (!user) {
    window.location.href = redirectPath;
    throw new Error('Redirecting to login');
  }
  return user;
}
