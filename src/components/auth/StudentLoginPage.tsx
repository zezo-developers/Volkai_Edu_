import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Separator } from '../ui/separator';
import { Eye, EyeOff, ArrowLeft, User, Mail, Lock, GraduationCap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface StudentLoginPageProps {
  onBack: () => void;
  onSwitchToSignup: () => void;
}

export function StudentLoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const success = await login(email, password, 'student');
      if (!success) {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] bg-[size:30px_30px]" />
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-transparent to-orange-50" />
      
      {/* Back Button */}
      <button
        onClick={()=>{}}
        className="absolute top-6 left-6 flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Home</span>
      </button>

      <div className="relative w-full max-w-md">
        <Card className="p-8 bg-white/95 backdrop-blur-sm border border-slate-200 shadow-xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mr-3">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-semibold text-slate-900">VolkaiHR Student</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back!</h1>
            <p className="text-slate-600">Sign in to continue your career journey</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email or Student ID</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@college.edu or STU123456"
                  className="pl-10 bg-white border-slate-200"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 pr-10 bg-white border-slate-200"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-sm">
                <input type="checkbox" className="rounded border-slate-300" />
                <span className="text-slate-600">Remember me</span>
              </label>
              <button type="button" className="text-sm text-orange-500 hover:text-orange-400">
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6">
            <Separator className="my-6" />
            <div className="text-center">
              <p className="text-slate-600 text-sm">
                Don't have an account?{' '}
                <button
                  onClick={()=>{}}
                  className="text-orange-500 hover:text-orange-400 font-medium"
                >
                  Sign up here
                </button>
              </p>
            </div>
          </div>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-600 text-center mb-2">Demo Student Login:</p>
            <div className="text-xs text-slate-600 text-center space-y-1">
              <div>Email: priya.sharma@demo.edu</div>
              <div>Password: student123</div>
            </div>
          </div>
        </Card>

        {/* Motivation */}
        <div className="mt-8 text-center">
          <p className="text-slate-600 text-sm mb-4">"Your future starts with preparation today"</p>
          <div className="flex items-center justify-center space-x-6 opacity-60">
            <div className="text-slate-600 text-sm">🏆 Career Ready</div>
            <div className="text-slate-600 text-sm">🎯 AI Powered</div>
            <div className="text-slate-600 text-sm">📈 Track Progress</div>
          </div>
        </div>
      </div>
    </div>
  );
}