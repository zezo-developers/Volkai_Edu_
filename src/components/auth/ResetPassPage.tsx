import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Separator } from '../ui/separator';
import { Eye, EyeOff, ArrowLeft, User, Mail, Lock, Building } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useMutation } from '@tanstack/react-query';
import AuthHttp from '../../api/auth/auth';
import { AxiosError } from 'axios';
import useAuthStore from '../../stores/authStore';
import { useNavigate, useParams } from "react-router-dom";
import { toast } from 'react-toastify';
import { handleErrorGlobally } from '../../utils/helper';

interface SignupPageProps {
  onBack: () => void;
  onSwitchToLogin: () => void;
}

export function ResetPassPage() {
  const [formData, setFormData] = useState({

    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const {setAccessToken, setRefreshToken, setUser, setOrganization} = useAuthStore.getState();
  const navigate = useNavigate();
  const token = useParams<{ token: string }>().token;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleFormValidation = ():Boolean => {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return true;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return true;
    }
    return false;
  }

  const handleResetPass = useMutation({
    mutationKey: ['register'],
    mutationFn: async () => {
      const isValidFailed = handleFormValidation();
      if(isValidFailed){
        throw new Error('Failed to create account. Please try again.');
      }

      const res = await AuthHttp.resetPassword(
        formData.password,
        token!
      )
      return res;      
    },
    onSuccess: (data) => {
      // Handle successful registration     
      toast.success('Password Reset Successfully');
      navigate('/auth/login');
    },
    onError: (error) => {
      // Handle registration error 
      toast.error(handleErrorGlobally(error));
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');    
    try {
      handleResetPass.mutate();
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-transparent to-slate-900" />
      

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
            <h1 className="text-2xl font-bold text-foreground mb-2">Reset Password </h1>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                {error}
              </div>
            )}



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

            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              disabled={handleResetPass.isPending}
            >
              {handleResetPass.isPending ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>


        </Card>


      </div>
    </div>
  );
}