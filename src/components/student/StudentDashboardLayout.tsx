import { useState, ReactNode } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  MessageSquare, 
  Brain, 
  Target,
  TrendingUp,
  Briefcase,
  Video,
  HelpCircle,
  MessageCircle,
  Search, 
  Bell, 
  ChevronDown,
  Menu,
  X,
  LogOut,
  GraduationCap,
  User
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import { useAuth } from '../../contexts/AuthContext';

interface StudentDashboardLayoutProps {
  children: ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: any;
  children?: SidebarItem[];
  badge?: string;
}

const sidebarItems: SidebarItem[] = [
  {
    id: 'main',
    label: 'MAIN',
    icon: null,
    children: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'resume-builder', label: 'Resume Builder', icon: FileText, badge: 'New' },
      { id: 'mock-interviews', label: 'Mock Interviews', icon: MessageSquare },
      { id: 'career-advisor', label: 'Career Advisor', icon: Brain },
      { id: 'skill-tests', label: 'Skill Tests', icon: Target },
      { id: 'reports', label: 'Reports', icon: TrendingUp }
    ]
  },
  {
    id: 'tools',
    label: 'TOOLS',
    icon: null,
    children: [
      { id: 'job-apply', label: 'Job Apply', icon: Briefcase, badge: 'Soon' },
      { id: 'live-interview', label: 'Live Interview', icon: Video, badge: 'Beta' }
    ]
  },
  {
    id: 'support',
    label: 'SUPPORT',
    icon: null,
    children: [
      { id: 'help-faqs', label: 'Help & FAQs', icon: HelpCircle },
      { id: 'contact-mentor', label: 'Contact Mentor', icon: MessageCircle }
    ]
  }
];

export function StudentDashboardLayout({ children, currentPage, onPageChange }: StudentDashboardLayoutProps) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleItemClick = (itemId: string) => {
    onPageChange(itemId);
    setSidebarOpen(false);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex">
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white/95 backdrop-blur-sm border-r border-slate-200 transform transition-transform duration-300 ease-in-out shadow-lg
        lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mr-3">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-slate-900">VolkaiHR Student</span>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
            {sidebarItems.map((section) => (
              <div key={section.id}>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-3">
                  {section.label}
                </div>
                <div className="space-y-1">
                  {section.children?.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      className={`
                        w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all duration-200
                        ${currentPage === item.id 
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg' 
                          : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                        }
                      `}
                    >
                      <div className="flex items-center">
                        <item.icon className="h-4 w-4 mr-3" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      {item.badge && (
                        <Badge 
                          variant={item.badge === 'New' ? 'default' : 'secondary'} 
                          className={`text-xs px-2 py-0.5 ${
                            currentPage === item.id ? 'bg-white/20 text-white' : ''
                          }`}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center space-x-3 text-sm">
              <Avatar className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                {user?.name?.charAt(0) || 'S'}
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 truncate">{user?.name}</div>
                <div className="text-xs text-slate-500 truncate">{user?.studentId} • {user?.year}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation */}
        <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-slate-600 hover:text-slate-900"
              >
                <Menu className="h-5 w-5" />
              </button>
              
              {/* Search */}
              <div className="relative w-80 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search features, reports..."
                  className="pl-9 bg-slate-50 border-slate-200 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100">
                <Bell className="h-5 w-5" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
              </button>

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-slate-100">
                    <Avatar className="h-8 w-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                      {user?.name?.charAt(0) || 'S'}
                    </Avatar>
                    <div className="hidden sm:block text-left">
                      <div className="text-sm font-semibold text-slate-900">{user?.name}</div>
                      <div className="text-xs text-slate-500">{user?.course}</div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Target className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Help & Support
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}