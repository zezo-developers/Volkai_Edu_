import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Separator } from '../ui/separator';
import { Eye, EyeOff, ArrowLeft, User, Mail, Lock, Building } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SignupPageProps {
  onBack: () => void;
  onSwitchToLogin: () => void;
}

export function SignupPage({ onBack, onSwitchToLogin }: SignupPageProps) {
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    college: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    try {
      const success = await signup(formData.name, formData.email, formData.password, formData.college, 'college');
      if (!success) {
        setError('Failed to create account. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-transparent to-slate-900" />
      
      {/* Back Button */}
      <button
        onClick={onBack}
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
            <h1 className="text-2xl font-bold text-foreground mb-2">Create Account</h1>
            <p className="text-muted-foreground">Start preparing your students for success</p>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Dr. John Smith"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@college.edu"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="college">College/Institution Name</Label>
              <div className="relative">
                <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="college"
                  name="college"
                  type="text"
                  value={formData.college}
                  onChange={handleChange}
                  placeholder="ABC Institute of Technology"
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
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a strong password"
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <input type="checkbox" className="mt-1 rounded border-border" required />
              <span className="text-sm text-muted-foreground">
                I agree to the{' '}
                <a href="#" className="text-orange-500 hover:text-orange-400">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-orange-500 hover:text-orange-400">Privacy Policy</a>
              </span>
            </div>

            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6">
            <Separator className="my-6" />
            <div className="text-center">
              <p className="text-muted-foreground text-sm">
                Already have an account?{' '}
                <button
                  onClick={onSwitchToLogin}
                  className="text-orange-500 hover:text-orange-400 font-medium"
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>

          {/* Benefits */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground text-center mb-2">What you get:</p>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>✓ Free trial with 50 students</div>
              <div>✓ AI-powered mock interviews</div>
              <div>✓ Resume builder & analytics</div>
              <div>✓ WhatsApp automation</div>
            </div>
          </div>
        </Card>

        {/* Trust Indicators */}
        <div className="mt-8 text-center">
          <p className="text-white/60 text-sm mb-4">Join 50+ colleges already using VolkaiHR EDU</p>
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