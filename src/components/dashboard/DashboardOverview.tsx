import { Users, UserCheck, MessageSquare, FileText, TrendingUp, Briefcase } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

// Mock data
const overviewCards = [
  {
    title: 'Total Students Imported',
    value: '1,250',
    change: '+12%',
    changeType: 'positive' as const,
    icon: Users,
    gradient: 'from-blue-500 to-blue-600'
  },
  {
    title: 'Students Active This Week',
    value: '876',
    change: '+8%',
    changeType: 'positive' as const,
    icon: UserCheck,
    gradient: 'from-green-500 to-green-600'
  },
  {
    title: 'Total Mock Interviews',
    value: '624',
    change: '+15%',
    changeType: 'positive' as const,
    icon: MessageSquare,
    gradient: 'from-purple-500 to-purple-600'
  },
  {
    title: 'Total Resumes Created',
    value: '740',
    change: '+20%',
    changeType: 'positive' as const,
    icon: FileText,
    gradient: 'from-orange-500 to-orange-600'
  },
  {
    title: 'Shortlisted Candidates',
    value: '312',
    change: '+25%',
    changeType: 'positive' as const,
    icon: Briefcase,
    gradient: 'from-cyan-500 to-cyan-600'
  },
  {
    title: 'Placement Readiness Index',
    value: '85%',
    change: '+5%',
    changeType: 'positive' as const,
    icon: TrendingUp,
    gradient: 'from-pink-500 to-pink-600'
  }
];

const interviewData = [
  { name: 'Excellent', value: 145, color: '#10B981' },
  { name: 'Good', value: 289, color: '#F59E0B' },
  { name: 'Needs Improvement', value: 190, color: '#EF4444' }
];

const resumeData = [
  { name: 'ATS-Ready', value: 45, color: '#10B981' },
  { name: 'Good', value: 35, color: '#F59E0B' },
  { name: 'Poor', value: 20, color: '#EF4444' }
];

const engagementData = [
  { name: 'Mon', active: 420 },
  { name: 'Tue', active: 380 },
  { name: 'Wed', active: 450 },
  { name: 'Thu', active: 420 },
  { name: 'Fri', active: 380 },
  { name: 'Sat', active: 280 },
  { name: 'Sun', active: 320 }
];

const quickActions = [
  {
    title: 'Add New Students',
    description: 'Bulk import students via Excel/CSV',
    icon: Users,
    buttonText: 'Import Students',
    color: 'bg-blue-500'
  },
  {
    title: 'Schedule Mock Interview Batch',
    description: 'Create batch interview sessions',
    icon: MessageSquare,
    buttonText: 'Schedule Batch',
    color: 'bg-purple-500'
  },
  {
    title: 'Send Reminder via WhatsApp',
    description: 'Automated reminders to students',
    icon: FileText,
    buttonText: 'Send Reminders',
    color: 'bg-green-500'
  }
];

export function DashboardOverview() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-muted-foreground">Monitor your college's placement preparation progress</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white">
          Export Report
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {overviewCards.map((card, index) => (
          <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{card.title}</p>
                <div className="flex items-baseline space-x-2">
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    card.changeType === 'positive' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {card.change}
                  </span>
                </div>
              </div>
              <div className={`w-12 h-12 bg-gradient-to-br ${card.gradient} rounded-lg flex items-center justify-center`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mock Interview Report */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Mock Interview Performance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={interviewData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Resume Score Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Resume Score Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={resumeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {resumeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center space-x-4 mt-4">
            {resumeData.map((entry, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                <span className="text-sm text-muted-foreground">{entry.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Engagement Analytics */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Student Engagement This Week</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="active" 
                stroke="#F97316" 
                strokeWidth={3}
                dot={{ fill: '#F97316', strokeWidth: 2, r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <action.icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground mb-1">{action.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3">{action.description}</p>
                  <Button variant="outline" size="sm" className="text-sm">
                    {action.buttonText}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {[
            { action: 'New student batch imported', details: '45 students from Computer Science', time: '2 hours ago', type: 'import' },
            { action: 'Mock interview completed', details: 'Priya Sharma - Technical Interview (Score: 85)', time: '3 hours ago', type: 'interview' },
            { action: 'Resume feedback generated', details: 'Automated feedback sent to 23 students', time: '5 hours ago', type: 'resume' },
            { action: 'WhatsApp reminder sent', details: 'Interview reminders sent to 67 students', time: '1 day ago', type: 'notification' }
          ].map((activity, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
              <div className={`w-2 h-2 rounded-full mt-2 ${
                activity.type === 'import' ? 'bg-blue-500' :
                activity.type === 'interview' ? 'bg-purple-500' :
                activity.type === 'resume' ? 'bg-orange-500' :
                'bg-green-500'
              }`}></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{activity.action}</p>
                <p className="text-xs text-muted-foreground">{activity.details}</p>
              </div>
              <span className="text-xs text-muted-foreground">{activity.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}