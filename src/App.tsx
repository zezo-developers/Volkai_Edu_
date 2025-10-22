import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Landing Page Components
import { Navigation } from './components/Navigation';
import { HeroSection } from './components/HeroSection';
import { ProblemSolution } from './components/ProblemSolution';
import { FeaturesSection } from './components/FeaturesSection';
import { HowItWorks } from './components/HowItWorks';
import { DemoPreview } from './components/DemoPreview';
import { BenefitsSection } from './components/BenefitsSection';
import { PricingSection } from './components/PricingSection';
import { TestimonialsSection } from './components/TestimonialsSection';
import { CTASection } from './components/CTASection';
import { Footer } from './components/Footer';

// Auth Components
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { StudentLoginPage } from './components/auth/StudentLoginPage';
import { StudentSignupPage } from './components/auth/StudentSignupPage';

// Dashboard Components
import { MainDashboard } from './components/dashboard/MainDashboard';
import { MainStudentDashboard } from './components/student/MainStudentDashboard';

// Update Navigation to include auth buttons
function LandingNavigation({ onLogin, onSignup, onStudentLogin }: { onLogin: () => void; onSignup: () => void; onStudentLogin: () => void }) {
  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="text-xl font-semibold text-foreground">VolkaiHR EDU</span>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <a href="#features" className="text-foreground hover:text-orange-500 transition-colors px-3 py-2">
                Features
              </a>
              <a href="#how-it-works" className="text-foreground hover:text-orange-500 transition-colors px-3 py-2">
                How It Works
              </a>
              <a href="#pricing" className="text-foreground hover:text-orange-500 transition-colors px-3 py-2">
                Pricing
              </a>
              <button 
                onClick={onStudentLogin}
                className="text-foreground hover:text-orange-500 transition-colors px-3 py-2"
              >
                Student Dashboard
              </button>
              <a href="#contact" className="text-foreground hover:text-orange-500 transition-colors px-3 py-2">
                Contact
              </a>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <button 
              onClick={onLogin}
              className="border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white px-4 py-2 rounded-lg transition-colors"
            >
              College Login
            </button>
            <button 
              onClick={onSignup}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Book a Demo
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function LandingPage({ onLogin, onSignup, onStudentLogin }: { onLogin: () => void; onSignup: () => void; onStudentLogin: () => void }) {
  return (
    <div className="min-h-screen bg-background">
      <LandingNavigation onLogin={onLogin} onSignup={onSignup} onStudentLogin={onStudentLogin} />
      <main>
        <HeroSection onGetStarted={onSignup} />
        <ProblemSolution />
        <FeaturesSection />
        <HowItWorks />
        <DemoPreview />
        <BenefitsSection />
        <PricingSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, userType } = useAuth();
  const [currentView, setCurrentView] = useState<'landing' | 'login' | 'signup' | 'student-login' | 'student-signup'>('landing');

  if (isAuthenticated) {
    return userType === 'student' ? <MainStudentDashboard /> : <MainDashboard />;
  }

  switch (currentView) {
    case 'login':
      return (
        <LoginPage 
          onBack={() => setCurrentView('landing')}
          onSwitchToSignup={() => setCurrentView('signup')}
        />
      );
    case 'signup':
      return (
        <SignupPage 
          onBack={() => setCurrentView('landing')}
          onSwitchToLogin={() => setCurrentView('login')}
        />
      );
    case 'student-login':
      return (
        <StudentLoginPage 
          onBack={() => setCurrentView('landing')}
          onSwitchToSignup={() => setCurrentView('student-signup')}
        />
      );
    case 'student-signup':
      return (
        <StudentSignupPage 
          onBack={() => setCurrentView('landing')}
          onSwitchToLogin={() => setCurrentView('student-login')}
        />
      );
    default:
      return (
        <LandingPage 
          onLogin={() => setCurrentView('login')}
          onSignup={() => setCurrentView('signup')}
          onStudentLogin={() => setCurrentView('student-login')}
        />
      );
  }
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}