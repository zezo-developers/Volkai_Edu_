import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Separator } from '../ui/separator';
import { Eye, EyeOff, ArrowLeft, Building, Mail, Lock } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import AuthHttp from '../../api/auth/auth';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import { handleErrorGlobally } from '../../utils/helper';
import { toast } from 'react-toastify';

interface LoginPageProps {
  onBack: () => void;
  onSwitchToSignup: () => void;
}

export function ForgotPassPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const {setAccessToken, setRefreshToken, setUser, setOrganization} = useAuthStore.getState();
  const navigate = useNavigate();


  const handleForgotPass = useMutation({
    mutationKey: ['forgot-password'],
    mutationFn: async () => {
      const res = await AuthHttp.forgotPassword(
         email,
      )
      return res;      
    },
    onSuccess: (data) => {
      // Handle successful registration
      toast.success('Password reset link sended to your email');
      navigate('/');
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
      handleForgotPass.mutate();
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
            <h1 className="text-2xl font-bold text-foreground mb-2">Enter Email to Recover Password</h1>
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

            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              disabled={handleForgotPass.isPending}
            >
              {handleForgotPass.isPending ? 'Sending...' : 'Send Email'}
            </Button>
          </form>


          {/* Demo Credentials */}

        </Card>

        {/* Trust Indicators */}

      </div>
    </div>
  );
}