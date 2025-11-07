import { Suspense, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastContainer } from 'react-toastify';

// Dashboard Components
import { MainDashboard } from './components/dashboard/MainDashboard';
import { MainStudentDashboard } from './components/student/MainStudentDashboard';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes';
import QueryProvider from './providers/queryClientProvider';


function AppContent() {
  const { isAuthenticated, userType } = useAuth();
  const [currentView, setCurrentView] = useState<'landing' | 'login' | 'signup' | 'student-login' | 'student-signup'>('landing');

  if (isAuthenticated) {
    return userType === 'student' ? <MainStudentDashboard /> : <MainDashboard />;
  }
return(<div/>)
  // switch (currentView) {
  //   case 'login':
  //     return (
  //       <LoginPage 
  //         onBack={() => setCurrentView('landing')}
  //         onSwitchToSignup={() => setCurrentView('signup')}
  //       />
  //     );
  //   case 'signup':
  //     return (
  //       <SignupPage 
  //         onBack={() => setCurrentView('landing')}
  //         onSwitchToLogin={() => setCurrentView('login')}
  //       />
  //     );
  //   case 'student-login':
  //     return (
  //       <StudentLoginPage 
  //         onBack={() => setCurrentView('landing')}
  //         onSwitchToSignup={() => setCurrentView('student-signup')}
  //       />
  //     );
  //   case 'student-signup':
  //     return (
  //       <StudentSignupPage 
  //         onBack={() => setCurrentView('landing')}
  //         onSwitchToLogin={() => setCurrentView('student-login')}
  //       />
  //     );
  //   default:
  //     return (
  //       <Home 
  //         onLogin={() => setCurrentView('login')}
  //         onSignup={() => setCurrentView('signup')}
  //         onStudentLogin={() => setCurrentView('student-login')}
  //       />
  //     );
  // }
}

export default function App() {
  return (
    <QueryProvider>
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<div>Loading...</div>}>
          <AppRoutes />
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
    <ToastContainer />
    </QueryProvider>
  );
}