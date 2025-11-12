import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Separator } from '../ui/separator';
import { Eye, EyeOff, ArrowLeft, Building, Mail, Lock } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import AuthHttp from '../../api/auth/auth';
import { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import { handleErrorGlobally } from '../../utils/helper';
import { toast } from 'react-toastify';

interface LoginPageProps {
  onBack: () => void;
  onSwitchToSignup: () => void;
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const {setAccessToken, setRefreshToken, setUser, setOrganization} = useAuthStore.getState();
  const navigate = useNavigate();

  const handleFormValidation = ():Boolean => {
    return false;
  }

  const handleLogin = useMutation({
    mutationKey: ['login'],
    mutationFn: async () => {
      const isValidFailed = handleFormValidation();
      if(isValidFailed){
        throw new Error('Failed to create account. Please try again.');
      }

      const res = await AuthHttp.loginUser({
        email: email,
        password: password,
      })
      return res;      
    },
    onSuccess: (data) => {
      // Handle successful registration
      console.log('res data: ', data?.data?.data?.tokens);
      const tokens = data?.data?.data?.tokens;
      const user = data?.data?.data?.user;
      const organization = data?.data?.data?.organization;
      
      setUser(user);
      setOrganization(organization);
      setAccessToken(tokens?.access);
      setRefreshToken(tokens.refresh);

      navigate('/dashboard');
    },
    onError: (error) => {
      // Handle registration error 
      console.log('error got: ', handleErrorGlobally(error))
      toast.error(handleErrorGlobally(error));
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');    
    try {
      handleLogin.mutate();
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-transparent to-slate-900" />
      
      {/* Back Button */}
      <button
        onClick={()=>{}}
        className="absolute top-6 left-6 flex items-center space-x-2 text-white/60 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Home</span>
      </button>

      <div className="relative w-full max-w-md">
        <Card className="p-8 bg-card/95 backdrop-blur-sm border-border shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">V</span>
              </div>
              <span className="text-2xl font-semibold text-foreground">VolkaiHR EDU</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to your college dashboard</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@college.edu"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-sm">
                <input type="checkbox" className="rounded border-border" />
                <span className="text-muted-foreground">Remember me</span>
              </label>
              <button type="button" onClick={()=>navigate('/auth/forgot-pass')} className="text-sm text-orange-500 hover:text-orange-400">
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              disabled={handleLogin.isPending}
            >
              {handleLogin.isPending ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6">
            <Separator className="my-6" />
            <div className="text-center">
              <p className="text-muted-foreground text-sm">
                Don't have an account?{' '}
                <button
                  onClick={()=>{}}
                  className="text-orange-500 hover:text-orange-400 font-medium"
                >
                  Sign up for free
                </button>
              </p>
            </div>
          </div>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground text-center mb-2">Demo Credentials:</p>
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <div>Email: admin@demo.edu</div>
              <div>Password: demo123</div>
            </div>
          </div>
        </Card>

        {/* Trust Indicators */}
        <div className="mt-8 text-center">
          <p className="text-white/60 text-sm mb-4">Trusted by 50+ colleges</p>
          <div className="flex items-center justify-center space-x-6 opacity-60">
            {['IIT', 'NIT', 'BITS', 'VIT'].map((college) => (
              <div key={college} className="text-white text-sm font-medium">
                {college}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}