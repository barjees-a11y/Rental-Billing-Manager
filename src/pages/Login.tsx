import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FileText, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { login, register, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (isResetting) {
      // Supabase sends a reset email, it doesn't instantly take a new password directly here
      const { success, error } = await resetPassword(email);
      if (success) {
        toast({
          title: 'Reset Email Sent',
          description: 'If an account exists, a password reset link has been sent.',
        });
        setIsResetting(false);
      } else {
        toast({
          title: 'Reset Failed',
          description: error || 'Could not send reset email. Please try again.',
          variant: 'destructive',
        });
      }
    } else if (isSignUp) {
      const { success, error } = await register(email, name || email.split('@')[0], password);

      if (success) {
        toast({
          title: 'Account created!',
          description: 'Please check your email to verify your account, or sign in if verification is off.',
        });
        setIsSignUp(false);
      } else {
        toast({
          title: 'Sign up failed',
          description: error || 'Unable to create account. Email may already be in use.',
          variant: 'destructive',
        });
      }
    } else {
      const { success, error } = await login(email, password);

      if (success) {
        toast({
          title: 'Welcome back!',
          description: 'You have successfully signed in.',
        });
        navigate('/');
      } else {
        toast({
          title: 'Login failed',
          description: error || 'Invalid email or password. Please verify your credentials or sign up.',
          variant: 'destructive',
        });
      }
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />

      <Card className="w-full max-w-md glass-card relative z-10 animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl gradient-text">Rental Billing Manager</CardTitle>
          <CardDescription>
            {isResetting
              ? 'Reset your password to regain access'
              : isSignUp
                ? 'Create a new account'
                : 'Sign in to manage your rental contracts and invoices'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">

            {isSignUp && !isResetting && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-background/50"
                  required={isSignUp}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background/50"
              />
            </div>

            {!isResetting ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetting(true);
                        setPassword('');
                      }}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-background/50 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {!isSignUp && (
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(c) => setRememberMe(!!c)}
                    />
                    <Label htmlFor="remember" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Remember me
                    </Label>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  We'll send a password recovery link to your email.
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading
                ? (isResetting ? 'Resetting...' : isSignUp ? 'Creating account...' : 'Signing in...')
                : (isResetting ? 'Reset Password' : isSignUp ? 'Sign Up' : 'Sign In')}
            </Button>

            {!isResetting ? (
              <div className="text-center pt-2 border-t mt-4">
                <p className="text-sm text-muted-foreground">
                  {isSignUp ? 'Already have an account?' : 'Don\'t have an account?'}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setPassword('');
                    }}
                    className="ml-1 text-primary hover:underline font-medium"
                  >
                    {isSignUp ? 'Sign In' : 'Sign Up'}
                  </button>
                </p>
              </div>
            ) : (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsResetting(false)}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Back to Login
                </button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
