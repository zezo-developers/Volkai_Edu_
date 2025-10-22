import { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  college?: string;
  studentId?: string;
  role: 'admin' | 'instructor' | 'student';
  course?: string;
  year?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  userType: 'college' | 'student' | null;
  login: (email: string, password: string, userType: 'college' | 'student') => Promise<boolean>;
  signup: (name: string, email: string, password: string, college: string, userType: 'college' | 'student', studentId?: string, course?: string, year?: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string, userType: 'college' | 'student'): Promise<boolean> => {
    // Mock authentication - in real app, this would call an API
    if (email && password) {
      if (userType === 'college') {
        const mockUser: User = {
          id: '1',
          name: 'Dr. Rajesh Kumar',
          email: email,
          college: 'IIT Bombay',
          role: 'admin'
        };
        setUser(mockUser);
        return true;
      } else {
        const mockStudent: User = {
          id: '2',
          name: 'Priya Sharma',
          email: email,
          studentId: 'CS21B1001',
          college: 'IIT Bombay',
          course: 'Computer Science Engineering',
          year: '4th Year',
          role: 'student'
        };
        setUser(mockStudent);
        return true;
      }
    }
    return false;
  };

  const signup = async (name: string, email: string, password: string, college: string, userType: 'college' | 'student', studentId?: string, course?: string, year?: string): Promise<boolean> => {
    // Mock signup - in real app, this would call an API
    if (name && email && password && college) {
      if (userType === 'college') {
        const newUser: User = {
          id: '1',
          name: name,
          email: email,
          college: college,
          role: 'admin'
        };
        setUser(newUser);
        return true;
      } else {
        const newStudent: User = {
          id: '2',
          name: name,
          email: email,
          studentId: studentId || 'STU' + Date.now(),
          college: college,
          course: course,
          year: year,
          role: 'student'
        };
        setUser(newStudent);
        return true;
      }
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    userType: user?.role === 'student' ? 'student' : user?.role ? 'college' : null,
    login,
    signup,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}