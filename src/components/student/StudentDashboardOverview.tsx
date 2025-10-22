import { 
  FileText, 
  MessageSquare, 
  TrendingUp, 
  Calendar,
  Target,
  Award,
  Clock,
  CheckCircle,
  Star,
  Zap,
  Brain
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts';
import { useAuth } from '../../contexts/AuthContext';

// Mock data
const progressData = [
  { name: 'Week 1', resume: 45, interview: 20, overall: 32 },
  { name: 'Week 2', resume: 60, interview: 35, overall: 48 },
  { name: 'Week 3', resume: 75, interview: 55, overall: 65 },
  { name: 'Week 4', resume: 85, interview: 72, overall: 78 }
];

const readinessData = [
  { name: 'Current', value: 78, fill: '#f97316' }
];

const achievements = [
  { icon: Award, title: 'Resume Master', description: 'Completed your first resume', unlocked: true },
  { icon: MessageSquare, title: 'Interview Ready', description: 'Completed 3 mock interviews', unlocked: true },
  { icon: Target, title: 'Skill Builder', description: 'Passed 5 skill assessments', unlocked: false },
  { icon: Star, title: 'Top Performer', description: 'Scored 90+ in interview', unlocked: false }
];

const upcomingTasks = [
  {
    type: 'resume',
    title: 'Update Skills Section',
    description: 'Add your latest project skills',
    deadline: 'Due Friday',
    priority: 'high',
    icon: FileText
  },
  {
    type: 'interview',
    title: 'AI Mock Interview',
    description: 'Technical interview scheduled',
    deadline: 'Tomorrow, 10 AM',
    priority: 'high',
    icon: MessageSquare
  },
  {
    type: 'career',
    title: 'Review Career Paths',
    description: 'Check AI-suggested career options',
    deadline: 'This week',
    priority: 'medium',
    icon: Brain
  }
];

export function StudentDashboardOverview() {
  const { user } = useAuth();

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-orange-600 to-yellow-500 rounded-2xl p-8 text-white">
        <div className="absolute inset-0 bg-white/5 bg-[radial-gradient(circle_at_50%_50%,_rgba(255,255,255,0.1)_1px,_transparent_1px)] bg-[length:20px_20px] opacity-30"></div>
        <div className="relative">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {getTimeGreeting()}, {user?.name?.split(' ')[0]}! 👋
              </h1>
              <p className="text-orange-100 text-lg">
                Ready to boost your career today? You're doing great!
              </p>
            </div>
            <div className="hidden md:block">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
                <Zap className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-slate-600 mb-1">Resume Score</p>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-slate-900">85</span>
                <span className="text-sm text-slate-500">/100</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <Progress value={85} className="h-2 mb-2" />
          <p className="text-xs text-green-600 font-medium">Excellent! ATS-optimized</p>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-slate-600 mb-1">Mock Interviews</p>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-slate-900">3</span>
                <span className="text-sm text-slate-500">/ 5 Scheduled</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <Progress value={60} className="h-2 mb-2" />
          <p className="text-xs text-blue-600 font-medium">2 more to complete</p>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-slate-600 mb-1">Career Readiness</p>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-slate-900">78%</span>
                <span className="text-sm text-green-600">+5%</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <Progress value={78} className="h-2 mb-2" />
          <p className="text-xs text-purple-600 font-medium">Intermediate Level</p>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-slate-600 mb-1">Next Interview</p>
              <div className="flex items-baseline space-x-2">
                <span className="text-lg font-bold text-slate-900">Tomorrow</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="mb-2">
            <p className="text-sm font-medium text-slate-900">Technical Round</p>
          </div>
          <p className="text-xs text-orange-600 font-medium">10:00 AM</p>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Button className="h-16 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white flex-col">
            <FileText className="h-6 w-6 mb-1" />
            <span>Build Resume</span>
          </Button>
          <Button className="h-16 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white flex-col">
            <MessageSquare className="h-6 w-6 mb-1" />
            <span>Mock Interview</span>
          </Button>
          <Button className="h-16 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white flex-col">
            <TrendingUp className="h-6 w-6 mb-1" />
            <span>View Report</span>
          </Button>
          <Button className="h-16 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white flex-col">
            <Brain className="h-6 w-6 mb-1" />
            <span>Career Advisor</span>
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Progress Journey</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="resume" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                  name="Resume Score"
                />
                <Line 
                  type="monotone" 
                  dataKey="interview" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 6 }}
                  name="Interview Score"
                />
                <Line 
                  type="monotone" 
                  dataKey="overall" 
                  stroke="#f97316" 
                  strokeWidth={3}
                  dot={{ fill: '#f97316', strokeWidth: 2, r: 6 }}
                  name="Overall Progress"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center space-x-6 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-slate-600">Resume</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-slate-600">Interview</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-sm text-slate-600">Overall</span>
            </div>
          </div>
        </Card>

        {/* Career Readiness Meter */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Career Readiness Level</h3>
          <div className="h-64 flex items-center justify-center">
            <div className="relative">
              <ResponsiveContainer width={200} height={200}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={readinessData}>
                  <RadialBar dataKey="value" cornerRadius={10} fill="#f97316" />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-slate-900">78%</span>
                <span className="text-sm text-slate-600">Intermediate</span>
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Next Level: Advanced</span>
              <span className="text-sm font-medium text-orange-600">22% to go</span>
            </div>
            <Progress value={78} className="h-2" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Tasks */}
        <Card className="lg:col-span-2 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Upcoming Tasks
          </h3>
          <div className="space-y-4">
            {upcomingTasks.map((task, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    task.priority === 'high' ? 'bg-red-100' :
                    task.priority === 'medium' ? 'bg-yellow-100' : 'bg-green-100'
                  }`}>
                    <task.icon className={`h-5 w-5 ${
                      task.priority === 'high' ? 'text-red-600' :
                      task.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
                    }`} />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">{task.title}</h4>
                    <p className="text-sm text-slate-600">{task.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'}>
                    {task.deadline}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Achievements */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <Award className="h-5 w-5 mr-2" />
            Achievements
          </h3>
          <div className="space-y-3">
            {achievements.map((achievement, index) => (
              <div key={index} className={`flex items-center space-x-3 p-3 rounded-lg ${
                achievement.unlocked ? 'bg-green-50 border border-green-200' : 'bg-slate-50 border border-slate-200'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  achievement.unlocked ? 'bg-green-500 text-white' : 'bg-slate-300 text-slate-500'
                }`}>
                  <achievement.icon className="h-4 w-4" />
                </div>
                <div>
                  <h4 className={`text-sm font-medium ${
                    achievement.unlocked ? 'text-green-900' : 'text-slate-600'
                  }`}>{achievement.title}</h4>
                  <p className={`text-xs ${
                    achievement.unlocked ? 'text-green-700' : 'text-slate-500'
                  }`}>{achievement.description}</p>
                </div>
                {achievement.unlocked && (
                  <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Motivation Quote */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">💪 Daily Motivation</h3>
          <p className="text-blue-800 text-lg italic">
            "Success is not final, failure is not fatal: it is the courage to continue that counts."
          </p>
          <p className="text-blue-600 text-sm mt-2">- Winston Churchill</p>
        </div>
      </Card>
    </div>
  );
}