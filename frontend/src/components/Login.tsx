import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Car, LogIn, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface LoginProps {
  onLogin: (user: any) => void;
  onSwitchToRegister: () => void;
}

export function Login({ onLogin, onSwitchToRegister }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Mock login - in production, call userApi.login
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Demo users
      const demoUsers = {
        'driver@demo.com': { id: 'd1', name: 'John Driver', email: 'driver@demo.com', phone: '+1234567890', role: 'driver' },
        'rider@demo.com': { id: 'r1', name: 'Sarah Rider', email: 'rider@demo.com', phone: '+1234567891', role: 'rider' },
      };

      const user = demoUsers[email as keyof typeof demoUsers];
      
      if (user && password === 'demo123') {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('auth_token', 'demo_token_' + user.id);
        toast.success(`Welcome back, ${user.name}!`);
        onLogin(user);
      } else {
        toast.error('Invalid credentials. Try driver@demo.com or rider@demo.com with password: demo123');
      }
    } catch (error) {
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-3 rounded-xl shadow-lg">
              <Car className="h-8 w-8 text-white" />
            </div>
            <span className="text-4xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              LastMile
            </span>
          </div>
          <p className="text-gray-600">Your last mile, simplified</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <p className="text-blue-900 mb-2">Demo Credentials:</p>
                <p className="text-blue-700 text-xs">Driver: driver@demo.com / demo123</p>
                <p className="text-blue-700 text-xs">Rider: rider@demo.com / demo123</p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>

              <div className="text-center text-sm">
                <span className="text-gray-600">Don't have an account? </span>
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Register here
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
