import { useState, ReactNode } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  MessageSquare, 
  FileText, 
  Briefcase, 
  Mail, 
  Settings, 
  Search, 
  Bell, 
  ChevronDown,
  Menu,
  X,
  LogOut
} from 'lucide-react';
import { Input } from '../ui/input';
import { Avatar } from '../ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import { useAuth } from '../../contexts/AuthContext';
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";

interface DashboardLayoutProps {
  children: ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: any;
  children?: SidebarItem[];
  path?: string;
}

const sidebarItems: SidebarItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard'
  },
  {
    id: 'students',
    label: 'Students',
    icon: Users,
    path: '/dashboard/students'
  },
  {
    id: 'instructors',
    label: 'Instructors',
    icon: UserCheck,
    path: '/dashboard/instructors'
  },
  {
    id: 'interviews',
    label: 'Interviews',
    icon: MessageSquare,
    path: '/dashboard/interviews'
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FileText,
    path: '/dashboard/reports'
  },
  {
    id: 'jobs',
    label: 'Jobs & Placement',
    icon: Briefcase,
    children: [
      { id: 'job-postings', label: 'Job Postings', icon: Briefcase, path:'/dashboard/job-postings' },
      { id: 'placement-insights', label: 'Placement Insights', icon: FileText, path:'/dashboard/placement-insights' }
    ],
    path: '/dashboard/jobs'
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: Mail,
    children: [
      { id: 'email-campaigns', label: 'Email Campaigns', icon: Mail, path:'/dashboard/email-campaigns' },
      { id: 'whatsapp-notifications', label: 'WhatsApp', icon: MessageSquare, path:'/dashboard/whatsapp-notifications' }
    ],
    path:'/dashboard/communication'
  },
  {
    id: 'settings',
    label: 'Settings & Billing',
    icon: Settings,
    path: '/dashboard/settings'
  }
];

export function DashboardLayout({ children, onPageChange }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['jobs', 'communication']);
  const navigate = useNavigate();
  const location = useLocation();
  const [currentPage, setCurrentPage] = useState(location.pathname);

  const toggleExpanded = (itemPath: string) => {
    setExpandedItems(prev =>{ 
      const newArr = prev.includes(itemPath) 
        ? prev.filter(id => id !== itemPath)
        : [...prev, itemPath]
      return newArr;
      }
    );

  };

  const handleItemClick = (itemPath: string) => {
    setCurrentPage(itemPath);
    const item = sidebarItems.find(i => i.path === itemPath);
    if (item?.children) {
      toggleExpanded(itemPath);
    } else {
      navigate(itemPath);
      setSidebarOpen(false);
    }
  };

  return (
    <div className="h-screen bg-background flex">
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="text-lg font-semibold text-foreground">VolkaiHR EDU</span>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {sidebarItems.map((item) => (
              <div key={item.id}>
                <button
                  onClick={() => handleItemClick(item.path!)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors
                    ${currentPage === item.path 
                      ? 'bg-orange-500 text-white' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }
                  `}
                >
                  <div className="flex items-center">
                    <item.icon className="h-4 w-4 mr-3" />
                    <span className="text-sm">{item.label}</span>
                  </div>
                  {item.children && (
                    <ChevronDown className={`h-3 w-3 transition-transform ${
                      expandedItems.includes(item.path!) ? 'rotate-180' : ''
                    }`} />
                  )}
                </button>
                
                {item.children && expandedItems.includes(item.path!) && (
                  <div className="ml-6 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => navigate(child.path!)}
                        className={`
                          w-full flex items-center px-3 py-1.5 rounded-lg text-left transition-colors text-sm
                          ${currentPage === child.path 
                            ? 'bg-orange-500/20 text-orange-500' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          }
                        `}
                      >
                        <child.icon className="h-3 w-3 mr-3" />
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center space-x-3 text-sm">
              <Avatar className="h-8 w-8 bg-orange-500 text-white">
                {user?.name.charAt(0) || 'U'}
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">{user?.college}</div>
                <div className="text-muted-foreground truncate">{user?.name}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-muted-foreground hover:text-foreground"
              >
                <Menu className="h-5 w-5" />
              </button>
              
              {/* Search */}
              <div className="relative w-80 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search student, interview, report..."
                  className="pl-9 bg-muted/50"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted">
                <Bell className="h-5 w-5" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full"></div>
              </button>

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted">
                    <Avatar className="h-8 w-8 bg-orange-500 text-white">
                      {user?.name.charAt(0) || 'U'}
                    </Avatar>
                    <div className="hidden sm:block text-left">
                      <div className="text-sm font-medium text-foreground">{user?.name}</div>
                      <div className="text-xs text-muted-foreground">{user?.role}</div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem>
                    <Users className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6 ">
          <Outlet/>
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